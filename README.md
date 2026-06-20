# Vite+ Monorepo Starter

A starter for creating a Vite+ monorepo.

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run the development server:

```bash
vp run dev
```

## Deployment

The docs site deploys via GitHub Actions: `prod` on pushes to `main`, preview stages on pull requests. Production URL: https://prisma-ltree.procka.org
