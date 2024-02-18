`use strict`;

const gulp = require(`gulp`);

process.env.NODE_ENV = `production`;

let assets = [
    `./resources/assets/**/*`,
    `!./resources/assets/**/*.css`, // CSS files
    `!./resources/assets/**/*.js`, // JS files
];

gulp.task('assets', () => {
    return gulp
        .src(assets, { nodir: true })
        .pipe(gulp.dest('public/assets/'));
});

gulp.task('css', () => {
    const postcss = require('gulp-postcss')
    const sourcemaps = require('gulp-sourcemaps')

    return gulp.src('./resources/assets/css/index.css')
        .pipe(require('gulp-rename')('app.css'))
        .pipe(sourcemaps.init())
        .pipe(postcss([
            require('postcss-import'),
            require('postcss-nested'),
            require('autoprefixer')
        ]))
        .pipe(postcss([
            require("tailwindcss")('./tailwind.config.js')
        ]))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('public/assets/'))
})

let apps = ['base', 'app', 'auth', 'admin', 'install'];
for (let i = 0; i < apps.length; i++) {
    const app = apps[i];

    gulp.task(`js:${app}`, () => {
        return require('rollup')
            .rollup({
                input: `./resources/assets/js/${app}/index.js`,
                plugins: [
                    require('@rollup/plugin-node-resolve')({
                        browser: true
                    }),
                    require('@rollup/plugin-commonjs')({
                        transformMixedEsModules: true
                    }),
                    require('@rollup/plugin-babel')({ babelHelpers: 'bundled' }),
                    require('@rollup/plugin-replace')({
                        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
                        preventAssignment: true
                    }),
                ],
                context: 'window',
            })
            .then(bundle => {
                return bundle.write({
                    file: `public/assets/${app}.js`,
                    format: 'iife',
                    name: 'library',
                    sourcemap: true
                });
            });
    });
}

gulp.task(`js`, gulp.parallel(apps.map(app => `js:${app}`), `js:install`));

gulp.task(`build`, gulp.series(`assets`, `css`, `js`));

gulp.task(`watch`, (done) => {
    process.env.NODE_ENV = `development`;

    gulp.watch(assets, gulp.series(`assets`));
    gulp.watch([`./tailwind.config.js`, `./resources/**/*`], gulp.series(`css`));
    gulp.watch([`./resources/assets/js/**/*`], gulp.series(`js`));

    done();
});

gulp.task(`default`, gulp.series(`build`));