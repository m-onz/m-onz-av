/**
 * Advanced Pattern Parser for PD.js (Mixtape)
 * Provides robust pattern parsing with extended syntax and transformations
 * FINAL VERSION with proper handling of complex nested patterns
 */

// Export for both node.js and Max/MSP/PD environments
if (typeof exports !== 'undefined') {
  exports.parser = parsePattern;
  if (typeof module === 'object') {
    module.exports = {
      parsePattern,
      parsePatternString,
      transformPattern,
      patternToString,
      createRandomPattern,
      normalizePattern
    };
  }
}

// Console output compatibility for different environments
if (typeof post !== 'function') function post(m) { console.log(m); }

/**
 * Main pattern parsing function
 * @param {string} pattern - The pattern string to parse
 * @param {Object} options - Optional settings for parser behavior
 * @returns {Array} - The parsed pattern as an array of notes/rests
 */
function parsePattern(pattern, options = {}) {
  // Handle empty or invalid patterns
  if (!pattern || typeof pattern !== 'string') {
    console.error("Invalid pattern input");
    return [];
  }

  // Default options
  const defaults = {
    debug: false,
    maxRecursionDepth: 10,
    preserveEmptyNotes: false,
    defaultRestValue: '-',
    normalizePitches: false
  };
  
  // Merge options
  const config = {...defaults, ...options};
  
  // Debug logging
  if (config.debug) {
    console.log(`Parsing pattern: ${pattern}`);
  }
  
  // Initialize recursion depth counter to prevent stack overflow
  config.currentDepth = 0;
  
  return parsePatternString(pattern, config);
}

/**
 * Parse a pattern string into an array of values
 * @param {string} pattern - The pattern string to parse
 * @param {Object} config - Parser configuration
 * @returns {Array} - The parsed pattern
 */
function parsePatternString(pattern, config) {
  let outputPattern = [];
  
  // Check recursion depth to prevent stack overflow
  if (config.currentDepth > config.maxRecursionDepth) {
    console.error(`Maximum recursion depth (${config.maxRecursionDepth}) exceeded. Pattern may have circular references.`);
    return outputPattern;
  }
  
  // Increment recursion depth
  config.currentDepth++;
  
  try {
    // First, handle simple patterns with no brackets for efficiency
    if (!pattern.includes('[')) {
      const parts = pattern.trim().split(/\s+/);
      for (const part of parts) {
        if (part.includes('*')) {
          // Handle repetition (e.g. "3*4")
          const [value, repeat] = part.split('*');
          const repeatCount = parseInt(repeat);
          
          if (isNaN(repeatCount) || repeatCount <= 0) {
            console.error(`Invalid repeat count: ${repeat}`);
            continue;
          }
          
          if (value === '-') {
            // Repeat rest
            for (let i = 0; i < repeatCount; i++) {
              outputPattern.push(config.defaultRestValue);
            }
          } else if (!isNaN(value)) {
            // Repeat numeric value
            const numValue = parseInt(value);
            for (let i = 0; i < repeatCount; i++) {
              outputPattern.push(numValue);
            }
          } else {
            console.error(`Invalid value for repetition: ${value}`);
          }
        } else if (part === '-') {
          // Handle rest
          outputPattern.push(config.defaultRestValue);
        } else if (!isNaN(part)) {
          // Handle numeric values
          outputPattern.push(parseInt(part));
        }
      }
    } else {
      // Handle more complex patterns with brackets
      outputPattern = processComplexPattern(pattern, config);
    }
  } catch (e) {
    console.error(`Error parsing pattern: ${e.message}`);
  }
  
  // Apply normalization if requested
  if (config.normalizePitches) {
    outputPattern = normalizePattern(outputPattern);
  }
  
  // Decrement recursion depth before returning
  config.currentDepth--;
  
  return outputPattern;
}

/**
 * Process a complex pattern with brackets, repetitions, and transformations
 * @param {string} pattern - The full pattern string
 * @param {Object} config - The configuration object
 * @returns {Array} - The parsed pattern array
 */
function processComplexPattern(pattern, config) {
  const result = [];
  let currentPos = 0;
  
  while (currentPos < pattern.length) {
    // Skip whitespace
    while (currentPos < pattern.length && /\s/.test(pattern[currentPos])) {
      currentPos++;
    }
    
    if (currentPos >= pattern.length) break;
    
    // Extract the next token
    const { token, newPos } = extractNextToken(pattern, currentPos);
    currentPos = newPos;
    
    if (!token) continue;
    
    // Process the token
    try {
      if (token === '-') {
        // Rest
        result.push(config.defaultRestValue);
      } else if (!isNaN(token)) {
        // Numeric value
        result.push(parseInt(token));
      } else if (token.includes('*') && !token.startsWith('[')) {
        // Single element repetition like "3*4"
        const [value, repeat] = token.split('*');
        const repeatCount = parseInt(repeat);
        
        if (isNaN(repeatCount) || repeatCount <= 0) {
          console.error(`Invalid repeat count: ${repeat}`);
          continue;
        }
        
        if (value === '-') {
          // Repeat rest
          for (let i = 0; i < repeatCount; i++) {
            result.push(config.defaultRestValue);
          }
        } else if (!isNaN(value)) {
          // Repeat numeric value
          const numValue = parseInt(value);
          for (let i = 0; i < repeatCount; i++) {
            result.push(numValue);
          }
        } else {
          console.error(`Invalid value for repetition: ${value}`);
        }
      } else if (/^\w+\[.*\]$/.test(token)) {
        // Transformation function like "scale2[1 2 3]"
        const transformName = token.substring(0, token.indexOf('['));
        const content = token.substring(token.indexOf('[') + 1, token.lastIndexOf(']'));
        
        // Parse the transformation content
        const contentPattern = parsePatternString(content, 
                                { ...config, currentDepth: config.currentDepth });
        
        // Apply the transformation
        const transformedPattern = transformPattern(transformName, contentPattern);
        result.push(...transformedPattern);
      } else if (/^\[.*\]\*\d+$/.test(token)) {
        // Group with repetition like "[1 2 3]*4"
        const closeBracketPos = token.lastIndexOf(']');
        const asteriskPos = token.indexOf('*', closeBracketPos);
        
        const group = token.substring(1, closeBracketPos);
        const repeat = token.substring(asteriskPos + 1);
        
        const repeatCount = parseInt(repeat);
        
        if (isNaN(repeatCount) || repeatCount <= 0) {
          console.error(`Invalid repeat count: ${repeat}`);
          continue;
        }
        
        // Parse the group content
        const groupPattern = parsePatternString(group, 
                              { ...config, currentDepth: config.currentDepth });
        
        // Repeat the group
        for (let i = 0; i < repeatCount; i++) {
          result.push(...groupPattern);
        }
      } else if (token.startsWith('[') && token.endsWith(']')) {
        // Simple group like "[1 2 3]"
        const content = token.substring(1, token.length - 1);
        const groupPattern = parsePatternString(content, 
                              { ...config, currentDepth: config.currentDepth });
        result.push(...groupPattern);
      } else {
        // Unknown token type
        if (config.debug) {
          console.error(`Unknown token type: ${token}`);
        }
      }
    } catch (e) {
      console.error(`Error processing token "${token}": ${e.message}`);
    }
  }
  
  return result;
}

/**
 * Extract the next token from a pattern string
 * @param {string} pattern - The pattern string
 * @param {number} startPos - The starting position
 * @returns {Object} - Object with the token and new position
 */
function extractNextToken(pattern, startPos) {
  let currentPos = startPos;
  
  // Skip whitespace
  while (currentPos < pattern.length && /\s/.test(pattern[currentPos])) {
    currentPos++;
  }
  
  if (currentPos >= pattern.length) {
    return { token: null, newPos: currentPos };
  }
  
  // Check for different token types
  if (pattern[currentPos] === '[') {
    // Group or transformation
    const transformMatch = /^([a-zA-Z]\w*)\[/.exec(pattern.substring(0, currentPos + 1));
    let bracketDepth = 1;
    let tokenEnd = currentPos + 1;
    
    // Find the matching closing bracket
    while (tokenEnd < pattern.length && bracketDepth > 0) {
      if (pattern[tokenEnd] === '[') {
        bracketDepth++;
      } else if (pattern[tokenEnd] === ']') {
        bracketDepth--;
      }
      tokenEnd++;
    }
    
    if (bracketDepth > 0) {
      console.error("Unbalanced brackets in pattern");
      return { token: null, newPos: pattern.length };
    }
    
    // Check if followed by a repetition operator
    if (tokenEnd < pattern.length && pattern[tokenEnd] === '*') {
      // Find the end of the repetition count
      let repeatEnd = tokenEnd + 1;
      while (repeatEnd < pattern.length && /\d/.test(pattern[repeatEnd])) {
        repeatEnd++;
      }
      
      // Include the repetition in the token
      if (transformMatch) {
        // This is a transformation function with brackets
        return {
          token: pattern.substring(currentPos - transformMatch[1].length, repeatEnd),
          newPos: repeatEnd
        };
      } else {
        // This is a group with repetition
        return {
          token: pattern.substring(currentPos, repeatEnd),
          newPos: repeatEnd
        };
      }
    } else {
      // No repetition
      if (transformMatch) {
        // This is a transformation function with brackets
        return {
          token: pattern.substring(currentPos - transformMatch[1].length, tokenEnd),
          newPos: tokenEnd
        };
      } else {
        // This is a simple group
        return {
          token: pattern.substring(currentPos, tokenEnd),
          newPos: tokenEnd
        };
      }
    }
  } else if (/\d|^-$/.test(pattern[currentPos])) {
    // Numeric value or rest
    let tokenEnd = currentPos + 1;
    
    // If it's a number, find the end of the number
    if (/\d/.test(pattern[currentPos])) {
      while (tokenEnd < pattern.length && /\d/.test(pattern[tokenEnd])) {
        tokenEnd++;
      }
    }
    
    // Check if followed by a repetition operator
    if (tokenEnd < pattern.length && pattern[tokenEnd] === '*') {
      // Find the end of the repetition count
      let repeatEnd = tokenEnd + 1;
      while (repeatEnd < pattern.length && /\d/.test(pattern[repeatEnd])) {
        repeatEnd++;
      }
      
      return {
        token: pattern.substring(currentPos, repeatEnd),
        newPos: repeatEnd
      };
    } else {
      return {
        token: pattern.substring(currentPos, tokenEnd),
        newPos: tokenEnd
      };
    }
  } else {
    // Single character token (likely a rest)
    return {
      token: pattern[currentPos],
      newPos: currentPos + 1
    };
  }
}

/**
 * Apply a transformation to a pattern
 * @param {string} transformName - Name of the transformation
 * @param {Array} pattern - The pattern to transform
 * @returns {Array} - The transformed pattern
 */
function transformPattern(transformName, pattern) {
  // Extract any numeric parameters from the transform name
  const paramMatch = transformName.match(/([a-z]+)(\d*)/);
  
  if (!paramMatch) {
    console.error(`Invalid transformation: ${transformName}`);
    return pattern;
  }
  
  const transform = paramMatch[1];
  const param = paramMatch[2] ? parseInt(paramMatch[2]) : null;
  
  switch (transform) {
    case 'scramble':
      // Randomize the order of the pattern
      return shuffleArray([...pattern]); // Create a copy to avoid modifying the original
      
    case 'invert':
      if (param === null) {
        console.error("invert transformation requires a numeric parameter");
        return pattern;
      }
      // Invert notes around a pivot value
      return pattern.map(note => note === '-' ? '-' : param * 2 - note);
      
    case 'scale':
      if (param === null) {
        console.error("scale transformation requires a numeric parameter");
        return pattern;
      }
      // Multiply all notes by a value
      return pattern.map(note => note === '-' ? '-' : note * param);
      
    case 'offset':
      if (param === null) {
        console.error("offset transformation requires a numeric parameter");
        return pattern;
      }
      // Add a value to all notes
      return pattern.map(note => note === '-' ? '-' : note + param);
      
    case 'mirror':
      // Mirror the pattern
      return [...pattern, ...pattern.slice(0, -1).reverse()];
      
    case 'repeat':
      if (param === null) {
        console.error("repeat transformation requires a numeric parameter");
        return pattern;
      }
      // Repeat each note multiple times
      return pattern.flatMap(note => Array(param).fill(note));
      
    case 'quantize':
      if (param === null) {
        console.error("quantize transformation requires a numeric parameter");
        return pattern;
      }
      // Round notes to the nearest multiple of a value
      return pattern.map(note => note === '-' ? '-' : Math.round(note / param) * param);
      
    case 'reverse':
      // Reverse the pattern
      return [...pattern].reverse();
      
    case 'rotate':
      // Rotate the pattern by a number of steps
      const steps = param || 1;
      const len = pattern.length;
      if (len <= 1) return pattern;
      const normalizedSteps = ((steps % len) + len) % len; // Handle negative steps
      return [...pattern.slice(normalizedSteps), ...pattern.slice(0, normalizedSteps)];
      
    case 'sparse':
      // Replace random notes with rests based on a probability
      const probability = param ? param / 100 : 0.5;
      return pattern.map(note => Math.random() < probability ? '-' : note);
      
    case 'interleave':
      // Interleave with rests
      return pattern.flatMap(note => [note, '-']);
    
    default:
      console.error(`Unknown transformation: ${transform}`);
      return pattern;
  }
}

/**
 * Normalize a pattern to ensure consistent values
 * @param {Array} pattern - The pattern to normalize
 * @returns {Array} - The normalized pattern
 */
function normalizePattern(pattern) {
  // Filter out undefined or null values, convert strings to appropriate types
  return pattern.map(item => {
    if (item === '-' || item === undefined || item === null) {
      return '-';
    }
    
    const parsed = parseInt(item);
    return isNaN(parsed) ? item : parsed;
  });
}

/**
 * Convert a pattern array back to a string representation
 * @param {Array} pattern - The pattern array
 * @returns {string} - String representation of the pattern
 */
function patternToString(pattern) {
  if (!Array.isArray(pattern)) {
    console.error("patternToString requires an array input");
    return "";
  }
  
  return pattern.join(' ');
}

/**
 * Create a random pattern with specified parameters
 * @param {Object} options - Options for random pattern generation
 * @returns {Array} - The generated random pattern
 */
function createRandomPattern(options = {}) {
  const defaults = {
    length: 16,
    minValue: 1,
    maxValue: 99,
    restProbability: 0.3,
    groupProbability: 0.2,
    repetitionProbability: 0.4
  };
  
  const config = {...defaults, ...options};
  const result = [];
  
  for (let i = 0; i < config.length; i++) {
    // Decide if we're adding a rest, a note, or a group
    const rand = Math.random();
    
    if (rand < config.restProbability) {
      // Add a rest
      result.push('-');
    } else if (rand < config.restProbability + config.groupProbability) {
      // Add a group (skip this for now if we're close to the end)
      if (i < config.length - 3) {
        const groupLength = Math.floor(Math.random() * 3) + 2; // 2-4 elements
        const group = [];
        
        for (let j = 0; j < groupLength; j++) {
          if (Math.random() < config.restProbability) {
            group.push('-');
          } else {
            group.push(Math.floor(Math.random() * (config.maxValue - config.minValue + 1)) + config.minValue);
          }
        }
        
        // Maybe repeat the group
        if (Math.random() < config.repetitionProbability) {
          const repeatCount = Math.floor(Math.random() * 3) + 2; // 2-4 repetitions
          for (let r = 0; r < repeatCount; r++) {
            result.push(...group);
          }
        } else {
          result.push(...group);
        }
        
        // Adjust index to account for the group
        i += groupLength - 1;
      } else {
        // Just add a note if we're close to the end
        result.push(Math.floor(Math.random() * (config.maxValue - config.minValue + 1)) + config.minValue);
      }
    } else {
      // Add a note
      const value = Math.floor(Math.random() * (config.maxValue - config.minValue + 1)) + config.minValue;
      
      // Maybe repeat this note
      if (Math.random() < config.repetitionProbability) {
        const repeatCount = Math.floor(Math.random() * 3) + 2; // 2-4 repetitions
        for (let r = 0; r < repeatCount; r++) {
          result.push(value);
        }
        // Adjust index to account for repetitions
        i += repeatCount - 1;
      } else {
        result.push(value);
      }
    }
  }
  
  return result;
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 * @param {Array} array - The array to shuffle
 * @returns {Array} - The shuffled array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Additional PureData integration
if (typeof inlets !== 'undefined') {
  inlets = 1;
  outlets = 1;
  
  // Handle input from PD
  function anything() {
    try {
      // Convert arguments to string
      const pattern = Array.prototype.slice.call(arguments).join(' ');
      // Parse the pattern
      const result = parsePattern(pattern);
      // Output the result
      outlet(0, result);
    } catch (e) {
      post("Error parsing pattern: " + e.message);
    }
  }
}