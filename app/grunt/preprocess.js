module.exports = {
	phonegap: {
		files: {
			'phonegap/www/app.css': 'dist/app.css',
			'phonegap/www/app.js': 'dist/app.js',
			'phonegap/www/lib.js': 'dist/lib.js',
			'phonegap/www/index.html': 'src/index.html',
			'phonegap/www/templates/authDialog.html': 'phonegap/www/templates/authDialog.html'
		},
		options: {
			inline: true,
			context: {
				PHONEGAP: true,
				KEYCHAIN: true
			}
		}
	},
	dist: {
		files: {
		'dist/app.css': 'dist/app.css',
		'dist/app.js': 'dist/app.js',
		'dist/lib.js': 'dist/lib.js',
		'dist/index.html': 'dist/index.html',
		'dist/templates/authDialog.html': 'dist/templates/authDialog.html'
		},
		options: {
			inline: true,
			context: {
				WEB: true
			}
		}
	}
}