# Simon memory game!

Written in React as an educational project for everyone to code and play.
Built with [Vite](https://vite.dev/), tested with [Vitest](https://vitest.dev/).

Requires Node 26+ (see `.nvmrc`).

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.

### `npm test`

Runs the test suite once (Vitest + React Testing Library).<br>
Use `npm run test:watch` for watch mode.

### `npm run build`

Builds the app for production into the `dist/` folder.

## Deployment

Merges to `main` are built and deployed to https://yyaanniivv.github.io/simon/
automatically by the [Deploy to GitHub Pages workflow](.github/workflows/deploy.yml).
Pull requests run tests + build via the [CI workflow](.github/workflows/ci.yml).
No manual deploy step is needed.
