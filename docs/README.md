# Documentation Generation Setup

This project now uses automated documentation generation powered by TypeDoc and GitHub Actions.

## How it works

1. **TypeDoc** automatically generates API documentation from JSDoc comments in the source code
2. **GitHub Actions** runs the documentation generation on every push to main branch
3. **Post-processing scripts** integrate the generated docs with the existing Nuxt.js documentation site
4. **GitHub Pages** automatically deploys the updated documentation

## Local Development

### Generate documentation locally
```bash
npm run docs:generate
```

### Serve documentation locally
```bash
npm run docs:dev
```

### Build documentation for production
```bash
npm run docs:build
```

## Documentation Structure

- `/docs/content/api-reference/` - Auto-generated TypeDoc documentation (gitignored)
- `/docs/content/4.api/reference/` - Processed docs integrated with Nuxt (gitignored)
- `/docs/content/4.api/index.md` - Manual API overview page
- `/scripts/post-process-docs.js` - Script to integrate TypeDoc output with Nuxt

## Adding Documentation

### For new classes, methods, or interfaces:
Add JSDoc comments to your TypeScript code:

```typescript
/**
 * Description of the class/method/interface
 * 
 * @example
 * ```typescript
 * // Usage example
 * const example = new MyClass();
 * ```
 * 
 * @param paramName - Description of parameter
 * @returns Description of return value
 */
```

### For manual documentation:
Edit files in `/docs/content/` following the existing structure.

## Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment includes:

- Auto-generated API reference from source code
- Manual documentation and guides
- Preserves the existing Nuxt.js styling and structure

## Configuration Files

- `typedoc.json` - TypeDoc configuration
- `.github/workflows/docs.yml` - GitHub Actions workflow
- `scripts/post-process-docs.js` - Integration script
