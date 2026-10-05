# F.W. Reports

A responsive, no-build personal landing page for reports and projects. It includes report search and category filters, expandable report context, a ZenithEngine project spotlight, an interactive chess demo, email contact actions, and an optional ambient soundscape generated in the browser.

Published with GitHub Pages: <https://cooreo.github.io/Landpage/>.

## Preview locally

From the repository root, run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The site is plain HTML, CSS, and JavaScript—no install step or build command is needed.

## ZenithEngine and chess demo

The project spotlight links to [ZenithEngine](https://github.com/Cooreo/ZenithEngine), a collaborative C++ chess-engine passion project built with friends. The small browser demo is separate: it uses `chess.js` for legal chess rules and a deliberately simple random-legal-move opponent. It is not connected to or presented as the C++ engine.

## Add reports

1. Put report files (PDFs, for example) in `reports/`.
2. Add an entry for each report to the `window.REPORTS` array in `reports.js`:

```js
window.REPORTS = [
  {
    title: "A report title",
    category: "Research",
    date: "2026-06-15",
    summary: "A short introduction to the question this report explores.",
    details: "More context about the research, its method, or its findings.",
    highlights: ["A useful takeaway", "Another point readers should know"],
    readTime: "8 min read",
    href: "reports/my-report.pdf"
  }
];
```

`title`, `summary`, and `href` are the main fields. `category`, `date`, `details`, `highlights`, and `readTime` are optional. Use a relative path for a file in this site or an `https://` URL for an externally hosted report. The archive cards, report count, category filter, search, and sort order are built from this list automatically.

## Ambient sound

Sound is opt-in: a visitor can turn on the soft, slowly changing synth pad with the **Sound off** button. It is generated locally with the Web Audio API; there is no audio file, external music service, or autoplay.

## Publish

GitHub Pages is deployed by the workflow in `.github/workflows/pages.yml` whenever the Arena working branch is updated. The workflow uploads this static site directly; there is no build step.

## Contact

The contact links are set to `fwepic01@gmail.com` in `index.html` and `script.js`.
