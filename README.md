<sub>*Hero made by [@ybouane](https://x.com/ybouane).*</sub>
<p align="center">
  <img src="https://crazygl.com/heroes/hero-code-to-product-transformation/banner-full.png" alt="Code to Product Transformation" width="640">
</p>

# @crazygl/hero-code-to-product-transformation

A panel of live syntax-highlighted source code dissolves into a stream of glowing character particles that stream across the canvas and reassemble into a polished product UI screenshot. A continuous 'code becomes product' loop for developer-tool and SaaS landing pages.

## Demo
[Code to Product Transformation](https://crazygl.com/hero/code-to-product-transformation)

## Install

```bash
npm install @crazygl/hero-code-to-product-transformation
```

## Usage

```tsx
import CodeToProductTransformation from '@crazygl/hero-code-to-product-transformation';

export default function Hero() {
  return (
    <CodeToProductTransformation
      heading="From a single line of code to a finished product."
      subheading="Real components, real syntax — no mockups, no detours."
      codeText={`export function Dashboard() { /* … */ }`}
      screenshot="/your-app-screenshot.png"
      onCTAClick="/signup"
    />
  );
}
```

## Customise

- **Content / CTA** — `heading`, `subheading`, `ctaLabel`, `onCTAClick` (URL or function), CTA colours.
- **Code panel** — `codeText`, `codeLanguage` (tsx/python/go/rust/css/json…), `codePanelLabel`, `codePanelTheme` (Dracula, One Dark, GitHub…).
- **Product** — `screenshot`, `productLabel`, `productMetaText`.
- **Transformation** — `transformationSpeed`, `particleDensity`, `particleSize`, `arcCurvature`, `trailLength`, `pointerInfluence`.
- **Theme / Background** — `colorTheme` presets (Midnight/Daylight/Aurora/Citrus/Custom), `transparentBackground`, `bgColor`.

## Best for

- Developer tools, SDKs and API products.
- AI / code-generation landing pages literally pitching "code to product."
- Premium SaaS launch sites with a shipping-speed hero statement.
- Build / deploy / preview platforms showing their core loop.



This hero is part of [CrazyGL](https://crazygl.com), a collection of production-ready WebGL, canvas, 3D, and typography effects. Every CrazyGL hero ships with an agent-ready `SKILL.md` file that helps developers and coding agents adapt the effect into custom landing pages and interactive experiences.
