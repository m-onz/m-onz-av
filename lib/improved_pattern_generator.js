/**
 * Improved Pattern Generator for Mixtape
 * Uses the parser2_final.js implementation to create high-quality musical patterns
 */

const parser = require('./parser2_final.js');

class ImprovedPatternGenerator {
    constructor() {
        this.patternCache = new Map();
    }

    /**
     * Generate a random integer up to max
     * @param {number} max - The maximum value
     * @returns {number} - A random integer
     */
    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    /**
     * Generate a simple pattern
     * @param {Object} options - Configuration options
     * @returns {string} - A pattern string
     */
    generateSimplePattern(options = {}) {
        const defaults = {
            length: 16,
            minValue: 1,
            maxValue: 99,
            restProbability: 0.4,
            repetitionProbability: 0.3,
            groupProbability: 0.2
        };
        
        const config = {...defaults, ...options};
        const pattern = parser.createRandomPattern(config);
        return pattern.join(' ');
    }

    /**
     * Generate a complex pattern with nested structures and transformations
     * @param {Object} options - Configuration options
     * @returns {string} - A complex pattern string
     */
    generateComplexPattern(options = {}) {
        const defaults = {
            sections: 3,
            transformProbability: 0.6,
            nestingProbability: 0.4
        };
        
        const config = {...defaults, ...options};
        const patternSections = [];
        
        for (let i = 0; i < config.sections; i++) {
            const sectionType = Math.random();
            
            if (sectionType < 0.3) {
                // Simple section - just values or rests
                patternSections.push(this.generateSimplePatternSection());
            } else if (sectionType < 0.6) {
                // Grouped section with repetition
                patternSections.push(this.generateGroupedSection());
            } else {
                // Transformation section
                patternSections.push(this.generateTransformationSection());
            }
        }
        
        return patternSections.join(' ');
    }

    /**
     * Generate a simple pattern section
     * @returns {string} - A pattern section
     */
    generateSimplePatternSection() {
        const length = Math.floor(Math.random() * 4) + 2; // 2-5 elements
        const section = parser.createRandomPattern({
            length,
            restProbability: 0.3,
            groupProbability: 0,
            repetitionProbability: 0.4
        });
        
        // Maybe repeat the entire section
        if (Math.random() > 0.7) {
            const repeat = Math.floor(Math.random() * 3) + 2; // 2-4 repetitions
            return `[${section.join(' ')}]*${repeat}`;
        }
        
        return section.join(' ');
    }

    /**
     * Generate a grouped pattern section
     * @returns {string} - A grouped pattern section
     */
    generateGroupedSection() {
        const length = Math.floor(Math.random() * 3) + 2; // 2-4 elements
        const section = parser.createRandomPattern({
            length,
            restProbability: 0.2,
            groupProbability: 0,
            repetitionProbability: 0.2
        });
        
        const repeat = Math.floor(Math.random() * 3) + 2; // 2-4 repetitions
        return `[${section.join(' ')}]*${repeat}`;
    }

    /**
     * Generate a transformation section
     * @returns {string} - A transformed pattern section
     */
    generateTransformationSection() {
        const transformations = [
            'invert5', 'scale2', 'offset3', 'mirror', 
            'repeat2', 'quantize5', 'reverse', 'rotate1'
        ];
        
        const transform = transformations[this.getRandomInt(transformations.length)];
        const length = Math.floor(Math.random() * 4) + 3; // 3-6 elements
        
        const pattern = parser.createRandomPattern({
            length,
            restProbability: 0.2,
            groupProbability: 0,
            repetitionProbability: 0.2
        });
        
        return `${transform}[${pattern.join(' ')}]`;
    }

    /**
     * Generate a musical pattern with specific rhythmic characteristics
     * @param {string} style - The musical style (e.g., 'dnb', 'house', etc.)
     * @returns {string} - A pattern string
     */
    generateStylePattern(style = 'generic') {
        switch (style.toLowerCase()) {
            case 'dnb':
                return this.generateDrumAndBassPattern();
            case 'house':
                return this.generateHousePattern();
            case 'minimal':
                return this.generateMinimalPattern();
            case 'glitch':
                return this.generateGlitchPattern();
            default:
                return this.generateGenericPattern();
        }
    }

    /**
     * Generate a Drum and Bass style pattern
     * @returns {string} - A DnB pattern
     */
    generateDrumAndBassPattern() {
        const patterns = [
            // Fast breakbeats with syncopated rhythms
            "[1 - - - - - 1 -]*2",
            "[- - 1 - - 1 - -]*2",
            "[1 - - 1 - 1 - -]*2",
            "1 - - - - - 1 - - - - - 1 - - -", // Classic DnB kick
            "- - - - 1 - - - - - - - 1 - - -", // Snare on the 5 and 13
            "[1 -]*8" // Fast hi-hats
        ];
        
        return patterns[this.getRandomInt(patterns.length)];
    }

    /**
     * Generate a House style pattern
     * @returns {string} - A House pattern
     */
    generateHousePattern() {
        const patterns = [
            // Four-on-the-floor kicks
            "[1 - - -]*4",
            "[1 - - - 1 - - -]*2",
            // Offbeat hi-hats
            "[- 1 - 1]*4", 
            "[- 1]*8",
            // Snare/clap on 2 and 4
            "[- - 1 - - - 1 -]*2"
        ];
        
        return patterns[this.getRandomInt(patterns.length)];
    }

    /**
     * Generate a Minimal style pattern
     * @returns {string} - A Minimal pattern
     */
    generateMinimalPattern() {
        const patterns = [
            // Sparse patterns with subtle variations
            "[1 - - - - - - -]*2",
            "1 - - - - - - - 2 - - - - - - -",
            "[- - 1 - - - - -]*4",
            "1 - - - 1 - - - - - 1 - - - - -"
        ];
        
        return patterns[this.getRandomInt(patterns.length)];
    }

    /**
     * Generate a Glitch style pattern
     * @returns {string} - A Glitch pattern
     */
    generateGlitchPattern() {
        const patterns = [
            // Irregular rhythms and unexpected hits
            "1 - 3 - - 2 - - 1 - - - 5 - 2 -",
            "scramble[1 2 3 4 5 6 7 8]",
            "1 - - 1 - 1 - - - 1 - - 1 - 1 -",
            "rotate3[1 - 2 - 3 - 4 -]"
        ];
        
        return patterns[this.getRandomInt(patterns.length)];
    }

    /**
     * Generate a generic pattern
     * @returns {string} - A generic pattern
     */
    generateGenericPattern() {
        const base = parser.createRandomPattern({
            length: 8,
            restProbability: 0.3
        });
        
        return base.join(' ');
    }

    /**
     * Generate a pattern with the specified complexity
     * @param {string} complexity - 'simple', 'complex', or a musical style
     * @returns {string} - The generated pattern
     */
    generatePattern(complexity = 'simple') {
        // Check if it's a musical style
        const musicalStyles = ['dnb', 'house', 'minimal', 'glitch'];
        if (musicalStyles.includes(complexity.toLowerCase())) {
            return this.generateStylePattern(complexity);
        }
        
        // Otherwise process as complexity level
        if (complexity === 'complex') {
            return this.generateComplexPattern();
        }
        
        return this.generateSimplePattern();
    }
}

// Export for both node.js and browser environments
if (typeof exports !== 'undefined') {
  if (typeof module === 'object') {
    module.exports = ImprovedPatternGenerator;
  }
}