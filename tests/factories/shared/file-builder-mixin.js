/**
 * @fileoverview File Builder Mixin
 *
 * Provides a standardized abstraction for test factories to dynamically building files.
 * Replaces repetitive implementations of `withFile` across various builder classes.
 *
 * @module tests/factories/shared/file-builder-mixin
 */

/**
 * Applies the `withFile` capability to a builder class.
 * Ensures that the class has an internal state tracker (i.e. `this.data`)
 * which must have a `files` array.
 * 
 * @param {Function} BaseClass The builder class to extend
 * @returns {Function} Extended class with `withFile` method
 */
export function FileBuilderMixin(BaseClass) {
    return class extends BaseClass {
        /**
         * Adds a file directly to the system.
         *
         * @param {string} filePath - Path relative to the source structure
         * @param {string} content - Raw string content of the file
         * @returns {this} The builder instance for chaining
         */
        withFile(filePath, content) {
            // Ensure data.files exists
            if (!this.data) this.data = {};
            if (!this.data.files) this.data.files = [];

            this.data.files.push({
                path: filePath,
                content
            });

            return this;
        }
    };
}
