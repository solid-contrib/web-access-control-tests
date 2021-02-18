module.exports = {
    roots: [
        "<rootDir>/test",
    ],
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: false,
    collectCoverage: false,
    testTimeout: 10000,
    globals: {
        'ts-jest': {
            // reference: https://kulshekhar.github.io/ts-jest/user/config/
        }
    }
};
