/**
 * Advanced Pattern Parser for PD.js (Mixtape)
 * Provides robust pattern parsing with extended syntax and transformations
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
  
  // Improved tokenization regex to handle more complex patterns
  // This regex can handle:
  // - Numbers and rests
  // - Complex groups with nested syntax
  // - Groups with repetition operators
  // - Transformation functions
  const tokens = pattern.match(/(\w+\s*\[.*?\]|\[.*?\]\*\d+|\[.*?\]|[^,;\s]+)/g);
  
  if (!tokens) {
    if (config.debug) {
      console.error("No valid tokens found in pattern");
    }
    config.currentDepth--;
    return outputPattern;
  }
  
  // Process each token
  tokens.forEach(token => {
    try {
      // Handle numeric values
      if (!isNaN(token)) {
        outputPattern.push(parseInt(token));
      }
      // Handle transformation functions
      else if (/^\w+\[.*\]$/.test(token)) {
        const result = handleTransformation(token, config);
        if (result && result.length) {
          outputPattern = outputPattern.concat(result);
        }
      }
      // Handle groups with repetition
      else if (token.includes(']*')) {
        const result = handleGroupWithRepeat(token, config);
        if (result && result.length) {
          outputPattern = outputPattern.concat(result);
        }
      }
      // Handle simple groups
      else if (token.startsWith('[') && token.endsWith(']')) {
        const groupContent = token.slice(1, -1).trim();
        const groupPattern = parsePatternString(groupContent, config);
        outputPattern = outputPattern.concat(groupPattern);
      }
      // Handle direct repetition (e.g., "3*4")
      else if (token.includes('*')) {
        const result = handleDirectRepetition(token, config);
        if (result && result.length) {
          outputPattern = outputPattern.concat(result);
        }
      }
      // Handle rest symbol
      else if (token === '-') {
        outputPattern.push(config.defaultRestValue);
      }
      // Try to parse as a number as a fallback
      else {
        const parsedToken = parseInt(token);
        if (!isNaN(parsedToken)) {
          outputPattern.push(parsedToken);
        } else if (config.debug) {
          console.error(`Invalid token: ${token}`);
        }
      }
    } catch (e) {
      console.error(`Error processing token "${token}": ${e.message}`);
    }
  });
  
  // Apply normalization if requested
  if (config.normalizePitches) {
    outputPattern = normalizePattern(outputPattern);
  }
  
  // Decrement recursion depth before returning
  config.currentDepth--;
  
  return outputPattern;
}

/**
 * Handle transformations like scramble, invert, scale, etc.
 * @param {string} token - The transformation token
 * @param {Object} config - Parser configuration
 * @returns {Array} - The transformed pattern
 */
function handleTransformation(token, config) {
  // Extract transformation name and content
  const transformName = token.substring(0, token.indexOf('['));
  const contentStart = token.indexOf('[') + 1;
  const contentEnd = token.lastIndexOf(']');
  
  if (contentStart >= contentEnd) {
    console.error(`Invalid transformation syntax: ${token}`);
    return [];
  }
  
  // Extract content inside brackets
  const groupContent = token.substring(contentStart, contentEnd);
  
  // Parse the content
  const groupPattern = parsePatternString(groupContent, config);
  
  // Apply the appropriate transformation
  return transformPattern(transformName, groupPattern);
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
 * Handle group with repeat syntax like "[1 2 3]*4"
 * @param {string} token - The group token
 * @param {Object} config - Parser configuration
 * @returns {Array} - The expanded pattern
 */
function handleGroupWithRepeat(token, config) {
  const [group, repeat] = token.split('*');
  
  if (!group || !repeat) {
    console.error(`Invalid group with repeat syntax: ${token}`);
    return [];
  }
  
  const repeatCount = parseInt(repeat);
  
  if (isNaN(repeatCount) || repeatCount <= 0) {
    console.error(`Invalid repeat count: ${repeat}`);
    return [];
  }
  
  // Extract the group content (remove the brackets)
  const groupContent = group.slice(1, -1).trim();
  
  // Parse the group content
  const groupPattern = parsePatternString(groupContent, config);
  
  // Repeat the group
  let result = [];
  for (let i = 0; i < repeatCount; i++) {
    result = result.concat(groupPattern);
  }
  
  return result;
}

/**
 * Handle direct repetition syntax like "3*4" or "-*8"
 * @param {string} token - The repetition token
 * @param {Object} config - Parser configuration
 * @returns {Array} - The expanded pattern
 */
function handleDirectRepetition(token, config) {
  const [value, repeat] = token.split('*');
  
  if (!value || !repeat) {
    console.error(`Invalid repetition syntax: ${token}`);
    return [];
  }
  
  const repeatCount = parseInt(repeat);
  
  if (isNaN(repeatCount) || repeatCount <= 0) {
    console.error(`Invalid repeat count: ${repeat}`);
    return [];
  }
  
  if (value === '-') {
    // Repeat rest
    return Array(repeatCount).fill(config.defaultRestValue);
  } else if (!isNaN(value)) {
    // Repeat numeric value
    return Array(repeatCount).fill(parseInt(value));
  } else {
    console.error(`Invalid value for repetition: ${value}`);
    return [];
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