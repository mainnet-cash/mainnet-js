module.exports = {
	rootDir: "../",
	preset: 'jest-puppeteer',
	testMatch: ["**/?(*.)+(spec|test).[t]s"],
	testPathIgnorePatterns: ['/node_modules/', 'dist'], // 
	setupFilesAfterEnv: ['<rootDir>/jest/browser.puppeteer.js'],
	transform: {
		"^.+\\.ts?$": "ts-jest"
	},
	globalSetup: '<rootDir>/jest/browser.setup.js',
};

