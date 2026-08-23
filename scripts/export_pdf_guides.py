#!/usr/bin/env python3
"""Render the built multilingual site through Chromium and assemble printable PDF guides.

The live website injects several images and captions client-side through
``learning-figures.js`` after the page loads. To make sure the PDF contains
exactly what a reader sees on the site, this script:

1. builds the requested locale(s) with the existing ``multilingual_site.py``;
2. serves the built site locally;
3. opens every chapter in Playwright/Chromium, waits for the page (and its
   learning-figure script) to finish rendering, and verifies every image
   has actually loaded;
4. extracts the rendered chapter content (not the original static HTML) and
   assembles it, in MkDocs navigation order, into one standalone printable
   HTML document per locale;
5. prints that document to an A4 PDF with Chromium.
"""

from __future__ import annotations

import argparse
import functools
import html
import http.server
import os
import shutil
import socketserver
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any

import yaml
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from publication_metadata import PublicationMetadata, get_metadata  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
MKDOCS_CONFIG = ROOT / "mkdocs.yml"
LOCALES_CONFIG = ROOT / "localization" / "locales.yml"
PRINT_CSS = Path(__file__).resolve().parent / "pdf_export" / "print.css"
SERVE_DIR = ROOT / ".pdf-export-serve"
REPO_BASENAME = "xinzuo-kung-fu"
GITHUB_REPO_URL = "https://github.com/francescocmazza/xinzuo-kung-fu"
PDF_NAME_BY_LOCALE = {
    "en": "The-Kung-Fu-of-Xinzuo-EN",
    "it": "Il-Kung-Fu-di-Xinzuo-IT",
    "zh-Hans": "Xinzuo-Kung-Fu-ZH-HANS",
}
IMAGE_RIGHTS_URL = f"{GITHUB_REPO_URL}/blob/main/content/en/assets/IMAGE_RIGHTS.md"
IMAGE_LOAD_TIMEOUT_MS = 20000
PRINT_COVER_NAME = "__print_cover__.html"
PRINT_REST_NAME = "__print_rest__.html"
HERO_IMAGE_REL = "assets/images/approved/home-hero-xinzuo-neutral.png"
HERO_IMAGE_ALT = "A craftsman inspecting a Xinzuo Damascus kitchen knife."
COVER_COPY = {
    "English": {
        "title": "The Kung Fu of Xinzuo",
        "subtitle": "A Practical Guide to Kitchen Knives",
        "strapline": "Materials, Shapes and Techniques for Masterful Cutting",
    },
    "Italiano": {
        "title": "Il Kung Fu di Xinzuo",
        "subtitle": "Guida pratica ai coltelli da cucina",
        "strapline": "Materiali, forme e tecniche per padroneggiare il taglio",
    },
    "简体中文": {
        "title": "Xinzuo 的功夫",
        "subtitle": "厨刀实用指南",
        "strapline": "材料、刀型与技法：掌握精准切割",
    },
}
EDITION_COPY = {
    "English": {
        "heading": "Edition and contributions",
        "availability": "This book is available free of charge on GitHub. Every comment, correction and proposal for improvement is welcome.",
        "contact": "If GitHub is unfamiliar, you can also write directly to the author.",
        "version": "Edition",
        "published": "Published / Exported",
    },
    "Italiano": {
        "heading": "Edizione e contributi",
        "availability": "Questo libro è disponibile gratuitamente su GitHub. Ogni commento, correzione e proposta di miglioramento è benvenuta.",
        "contact": "Se GitHub non ti è familiare, puoi anche scrivere direttamente all'autore.",
        "version": "Edizione",
        "published": "Pubblicato / Esportato",
    },
    "简体中文": {
        "heading": "版本与贡献",
        "availability": "本书可在 GitHub 免费获取。欢迎提出任何意见、纠正和改进建议。",
        "contact": "如果您不熟悉 GitHub，也可以直接给作者写信。",
        "version": "版本",
        "published": "发布 / 导出",
    },
}
# The cover page already features the approved hero photograph prominently,
# so the same image is skipped when printing the home chapter to avoid
# showing it twice in a row at the start of the book.
PRINT_SKIP_VISUAL_IDS = {"index": ["VIS-HOME-01"]}

EXTRACT_JS = """
([chapterId, hidePlaceholders, urlToId, skipVisualIds]) => {
  const article = document.querySelector('article.md-content__inner');
  if (!article) return null;
  const clone = article.cloneNode(true);

  clone.querySelectorAll('.md-content__button').forEach(el => el.remove());
  clone.querySelectorAll('.headerlink').forEach(el => el.remove());
  clone.querySelectorAll('.admonition').forEach(el => {
    const title = el.querySelector('.admonition-title')?.textContent.trim().toLowerCase() || '';
    if (title === 'translation notice') el.remove();
  });
  if (hidePlaceholders) {
    clone.querySelectorAll('.kb-image-placeholder-wrap').forEach(el => el.remove());
  }
  if (skipVisualIds && skipVisualIds.length) {
    clone.querySelectorAll('[data-visual-id]').forEach(el => {
      if (skipVisualIds.includes(el.dataset.visualId)) el.remove();
    });
  }

  clone.querySelectorAll('img').forEach(img => {
    const rawSrc = img.getAttribute('src');
    if (rawSrc) img.setAttribute('src', new URL(rawSrc, document.baseURI).href);
    img.setAttribute('loading', 'eager');
    img.removeAttribute('srcset');
  });

  clone.querySelectorAll('[id]').forEach(el => {
    el.setAttribute('id', chapterId + '--' + el.getAttribute('id'));
  });

  clone.querySelectorAll('a[href]').forEach(a => {
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:')) return;
    if (raw.startsWith('#')) {
      a.setAttribute('href', '#' + chapterId + '--' + raw.slice(1));
      return;
    }
    try {
      const resolved = new URL(raw, document.baseURI);
      const hashIndex = resolved.href.indexOf('#');
      const base = hashIndex >= 0 ? resolved.href.slice(0, hashIndex) : resolved.href;
      const fragment = hashIndex >= 0 ? resolved.href.slice(hashIndex + 1) : '';
      const normalizedBase = base.endsWith('/') ? base : base + '/';
      const targetId = urlToId[normalizedBase];
      if (targetId) {
        a.setAttribute('href', fragment ? ('#' + targetId + '--' + fragment) : ('#' + targetId));
      } else {
        a.setAttribute('href', resolved.href);
      }
    } catch (err) {
      /* Leave anything we cannot resolve untouched rather than break the link. */
    }
  });

  const h1 = clone.querySelector('h1');
  return { title: h1 ? h1.textContent.trim() : '', html: clone.innerHTML };
}
"""

IMAGES_READY_JS = (
    "() => Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)"
)

BROKEN_IMAGES_JS = (
    "els => els.filter(img => !(img.complete && img.naturalWidth > 0)).map(img => img.src)"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--locales",
        nargs="+",
        default=["all"],
        help="Locale codes to export (e.g. en it zh-Hans), or 'all' for every active locale.",
    )
    parser.add_argument(
        "--placeholders",
        choices=["hide", "show"],
        default="hide",
        help="Whether to suppress the editorial IMAGE PLACEHOLDER boxes in the PDF.",
    )
    parser.add_argument(
        "--output-dir",
        default="pdf-export",
        help="Directory (relative to the repository root unless absolute) to write PDFs into.",
    )
    return parser.parse_args()


def read_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def relpath_to_urlpath(relpath: str) -> str:
    relpath = relpath.replace("\\", "/")
    if relpath == "index.md":
        return ""
    if relpath.endswith(".md"):
        relpath = relpath[:-3]
    relpath = relpath.strip("/")
    return f"{relpath}/" if relpath else ""


def flatten_nav(nav_items: list) -> tuple[list[dict], list[dict]]:
    """Turn the mkdocs.yml ``nav`` tree into a TOC tree plus a flat, ordered chapter list.

    Both structures share the same node dictionaries, so annotating a node
    (chapter id, rendered title, extracted HTML) through the flat list is
    automatically visible from the tree used to render the table of contents.
    """
    tree: list[dict] = []
    flat: list[dict] = []
    for item in nav_items:
        if not isinstance(item, dict):
            continue
        for label, value in item.items():
            if isinstance(value, str):
                node = {"label": label, "urlpath": relpath_to_urlpath(value), "leaf": True}
                tree.append(node)
                flat.append(node)
            elif isinstance(value, list):
                child_tree, child_flat = flatten_nav(value)
                tree.append({"label": label, "leaf": False, "children": child_tree})
                flat.extend(child_flat)
    return tree, flat


def build_site(locales: list[str]) -> None:
    cmd = [sys.executable, str(ROOT / "scripts" / "multilingual_site.py")]
    if any(code != "en" for code in locales):
        cmd.append("--require-translations")
    cmd += ["--locales", *locales]
    print("Building site:", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        pass


class _ReusableServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def stage_serve_root(locales: list[str]) -> Path:
    if SERVE_DIR.exists():
        shutil.rmtree(SERVE_DIR)
    serve_root = SERVE_DIR / REPO_BASENAME
    serve_root.mkdir(parents=True)
    for code in locales:
        source = SITE / code
        if not source.exists():
            raise RuntimeError(f"Expected built site for locale '{code}' at {source}, but it is missing.")
        (serve_root / code).symlink_to(source.resolve(), target_is_directory=True)
    return SERVE_DIR


def start_server(directory: Path) -> tuple[_ReusableServer, threading.Thread]:
    handler = functools.partial(_QuietHandler, directory=str(directory))
    httpd = _ReusableServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, thread


def force_images_eager(page) -> None:
    page.evaluate(
        "document.querySelectorAll('img').forEach(img => { if (img.loading === 'lazy') img.loading = 'eager'; });"
    )


def wait_for_images_loaded(page, context_label: str) -> None:
    try:
        page.wait_for_function(IMAGES_READY_JS, timeout=IMAGE_LOAD_TIMEOUT_MS)
    except PlaywrightTimeoutError as exc:
        broken = page.eval_on_selector_all("img", BROKEN_IMAGES_JS)
        raise RuntimeError(
            f"One or more images failed to load while rendering {context_label}: {broken}"
        ) from exc


def render_cover_html(language_name: str, metadata: PublicationMetadata, hero_src: str) -> str:
    copy = COVER_COPY.get(language_name, COVER_COPY["English"])
    return f"""
    <section class="kb-cover">
      <div class="kb-cover__top">
        <h1 class="kb-cover__title">{html.escape(copy["title"])}</h1>
        <p class="kb-cover__subtitle">{html.escape(copy["subtitle"])}<br>{html.escape(copy["strapline"])}</p>
        <p class="kb-cover__author">Francesco Claudio Mazza<br>EU Brand and Operations Manager, Xinzuo</p>
        <p class="kb-cover__language">{html.escape(language_name)}</p>
      </div>
      <div class="kb-cover__hero">
        <img src="{html.escape(hero_src)}" alt="{html.escape(HERO_IMAGE_ALT)}" loading="eager">
      </div>
      <div class="kb-cover__bottom">
        <p class="kb-cover__meta">{html.escape(GITHUB_REPO_URL)}</p>
        <p class="kb-cover__meta">{html.escape(metadata.full_label)}</p>
        <p class="kb-cover__meta">Published / Exported {html.escape(metadata.publication_date)}</p>
        <p class="kb-cover__rights">
          The original written content is generally licensed under CC BY-NC-SA 4.0.
          Some images, including Xinzuo catalog and promotional material, carry separate rights
          and are not automatically covered by that licence.
          See <a href="{IMAGE_RIGHTS_URL}">IMAGE_RIGHTS.md</a> in the repository for details.
        </p>
      </div>
    </section>
    """


def render_toc_nodes(nodes: list[dict]) -> str:
    items = []
    for node in nodes:
        if node.get("leaf"):
            label = html.escape(node.get("title") or node["label"])
            items.append(f'<li><a href="#{node["id"]}">{label}</a></li>')
        else:
            label = html.escape(node["label"])
            children = render_toc_nodes(node["children"])
            items.append(f'<li><span class="kb-toc__group">{label}</span><ul>{children}</ul></li>')
    return "".join(items)


def render_toc_html(tree: list[dict]) -> str:
    return f'<section class="kb-toc"><h2>Contents</h2><ul>{render_toc_nodes(tree)}</ul></section>'


def render_chapter_html(node: dict) -> str:
    return f'<section class="kb-chapter" id="{node["id"]}">{node["html"]}</section>'


def render_edition_html(language_name: str, metadata: PublicationMetadata) -> str:
    copy = EDITION_COPY.get(language_name, EDITION_COPY["English"])
    return f"""
    <section class="kb-edition">
      <div class="kb-edition__content">
        <p class="kb-edition__eyebrow">The Kung Fu of Xinzuo</p>
        <h2>{html.escape(copy["heading"])}</h2>
        <p>{html.escape(copy["availability"])}</p>
        <p><a href="{GITHUB_REPO_URL}">{GITHUB_REPO_URL}</a></p>
        <p>{html.escape(copy["contact"])}</p>
        <p><a href="mailto:francescoclaudiomazza@gmail.com">francescoclaudiomazza@gmail.com</a></p>
        <div class="kb-edition__metadata">
          <p>{html.escape(copy["version"])}: {html.escape(metadata.version_label)} · commit {html.escape(metadata.commit_sha_short)}</p>
          <p>{html.escape(copy["published"])}: {html.escape(metadata.publication_date)}</p>
        </div>
      </div>
    </section>
    """


def _wrap_document(lang: str, direction: str, body_class: str, title: str, css_text: str, body_content: str) -> str:
    return f"""<!doctype html>
<html lang="{lang}" dir="{direction}">
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>{css_text}</style>
</head>
<body dir="{direction}" class="{body_class}">
{body_content}
</body>
</html>"""


def assemble_cover_document(cfg: dict, metadata: PublicationMetadata, css_text: str, hero_src: str) -> str:
    """A standalone one-page document for the cover, printed without a footer."""
    direction = cfg.get("direction", "ltr")
    lang = cfg.get("mkdocs_language", "en")
    cover = render_cover_html(cfg["name"], metadata, hero_src)
    return _wrap_document(lang, direction, "", f"The Kung Fu of Xinzuo - {cfg['name']}", css_text, cover)


def assemble_rest_document(
    cfg: dict,
    tree: list[dict],
    flat: list[dict],
    hide_placeholders: bool,
    css_text: str,
    metadata: PublicationMetadata,
) -> str:
    """The table of contents and every chapter, printed with a numbered footer.

    Kept separate from the cover so that Chromium's per-document page-number
    footer never has to be suppressed on page 1 - Chromium's headless print
    header/footer templates do not reliably run the inline <script> tricks
    commonly used for that, so the cover is rendered as its own document
    instead and the two PDFs are merged afterwards.
    """
    direction = cfg.get("direction", "ltr")
    lang = cfg.get("mkdocs_language", "en")
    body_class = "kb-placeholders-hidden" if hide_placeholders else ""
    toc = render_toc_html(tree)
    chapters = "".join(render_chapter_html(node) for node in flat)
    edition = render_edition_html(cfg["name"], metadata)
    return _wrap_document(
        lang, direction, body_class, f"The Kung Fu of Xinzuo - {cfg['name']}", css_text, toc + chapters + edition
    )


def footer_template(direction: str) -> str:
    return f"""
    <div style="font-size:8px; width:100%; text-align:center; color:#666;
                font-family:'Noto Sans',sans-serif; direction:{direction};">
      The Kung Fu of Xinzuo &nbsp;&middot;&nbsp; <span class="pageNumber"></span>
    </div>
    """


PDF_MARGIN = {"top": "20mm", "bottom": "18mm", "left": "18mm", "right": "18mm"}


def render_locale_pdf(
    browser,
    code: str,
    cfg: dict,
    tree: list[dict],
    flat: list[dict],
    hide_placeholders: bool,
    base_url: str,
    css_text: str,
    metadata: PublicationMetadata,
    pdf_path: Path,
) -> None:
    known_urls = {f"{base_url}{code}/{node['urlpath']}": node["id"] for node in flat}
    page = browser.new_page()
    cover_pdf = pdf_path.with_suffix(".cover.pdf")
    rest_pdf = pdf_path.with_suffix(".rest.pdf")
    try:
        for node in flat:
            url = f"{base_url}{code}/{node['urlpath']}"
            label = node["urlpath"] or "index"
            page_key = node["urlpath"].rstrip("/") or "index"
            skip_visual_ids = PRINT_SKIP_VISUAL_IDS.get(page_key, [])
            page.goto(url, wait_until="load")
            force_images_eager(page)
            wait_for_images_loaded(page, f"{code}:{label}")
            result = page.evaluate(EXTRACT_JS, [node["id"], hide_placeholders, known_urls, skip_visual_ids])
            if result is None:
                raise RuntimeError(f"Could not find rendered article content at {url}")
            node["title"] = result["title"] or node["label"]
            node["html"] = result["html"]

        pdf_path.parent.mkdir(parents=True, exist_ok=True)

        hero_src = f"{base_url}{code}/{HERO_IMAGE_REL}"
        cover_html = assemble_cover_document(cfg, metadata, css_text, hero_src)
        (SITE / code / PRINT_COVER_NAME).write_text(cover_html, encoding="utf-8")
        page.goto(f"{base_url}{code}/{PRINT_COVER_NAME}", wait_until="load")
        wait_for_images_loaded(page, f"{code}:cover")
        page.pdf(path=str(cover_pdf), format="A4", print_background=True, margin=PDF_MARGIN)

        rest_html = assemble_rest_document(cfg, tree, flat, hide_placeholders, css_text, metadata)
        (SITE / code / PRINT_REST_NAME).write_text(rest_html, encoding="utf-8")
        page.goto(f"{base_url}{code}/{PRINT_REST_NAME}", wait_until="load")
        wait_for_images_loaded(page, f"{code}:assembled book")
        page.pdf(
            path=str(rest_pdf),
            format="A4",
            print_background=True,
            display_header_footer=True,
            header_template="<span></span>",
            footer_template=footer_template(cfg.get("direction", "ltr")),
            margin=PDF_MARGIN,
        )

        merge_pdfs([cover_pdf, rest_pdf], pdf_path)
    finally:
        page.close()
        (SITE / code / PRINT_COVER_NAME).unlink(missing_ok=True)
        (SITE / code / PRINT_REST_NAME).unlink(missing_ok=True)
        cover_pdf.unlink(missing_ok=True)
        rest_pdf.unlink(missing_ok=True)

    if not pdf_path.exists() or pdf_path.stat().st_size < 2000:
        raise RuntimeError(f"PDF generation for locale '{code}' produced no usable output at {pdf_path}")


def merge_pdfs(parts: list[Path], destination: Path) -> None:
    from pypdf import PdfWriter

    writer = PdfWriter()
    for part in parts:
        writer.append(str(part))
    with destination.open("wb") as handle:
        writer.write(handle)


def main() -> int:
    args = parse_args()
    locale_cfg = read_yaml(LOCALES_CONFIG).get("locales", {})
    deployed = [code for code, cfg in locale_cfg.items() if cfg.get("deploy")]

    if args.locales == ["all"]:
        requested = deployed
    else:
        requested = args.locales
        unknown = [code for code in requested if code not in locale_cfg]
        if unknown:
            raise SystemExit(f"Unknown locale(s): {', '.join(unknown)}")
        disabled = [code for code in requested if code not in deployed]
        if disabled:
            raise SystemExit(
                f"Locale(s) are not enabled for PDF export: {', '.join(disabled)}. "
                f"Active locales: {', '.join(deployed)}"
            )

    build_site(requested)

    mkdocs_config = read_yaml(MKDOCS_CONFIG)
    tree, flat = flatten_nav(mkdocs_config.get("nav", []))
    if not flat:
        raise SystemExit("mkdocs.yml nav produced no chapters; refusing to export an empty book.")
    for index, node in enumerate(flat, start=1):
        node["id"] = f"chapter-{index}"

    css_text = PRINT_CSS.read_text(encoding="utf-8")
    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = ROOT / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    serve_root = stage_serve_root(requested)
    httpd, thread = start_server(serve_root)
    port = httpd.server_address[1]
    base_url = f"http://127.0.0.1:{port}/{REPO_BASENAME}/"
    metadata = get_metadata()
    print(f"Publication metadata: {metadata.full_label} · {metadata.publication_date}", flush=True)

    generated: list[Path] = []
    try:
        with sync_playwright() as playwright:
            launch_kwargs: dict[str, Any] = {}
            chromium_override = os.environ.get("PDF_EXPORT_CHROMIUM_PATH")
            if chromium_override:
                launch_kwargs["executable_path"] = chromium_override
            browser = playwright.chromium.launch(**launch_kwargs)
            try:
                for code in requested:
                    cfg = locale_cfg[code]
                    pdf_stem = PDF_NAME_BY_LOCALE.get(code, f"Xinzuo-Kung-Fu-{code.upper()}")
                    pdf_path = output_dir / f"{pdf_stem}-{metadata.version_label}.pdf"
                    print(f"Rendering {code} -> {pdf_path.name}", flush=True)
                    render_locale_pdf(
                        browser, code, cfg, tree, flat, args.placeholders == "hide",
                        base_url, css_text, metadata, pdf_path,
                    )
                    generated.append(pdf_path)
            finally:
                browser.close()
    finally:
        httpd.shutdown()
        thread.join(timeout=5)
        shutil.rmtree(SERVE_DIR, ignore_errors=True)

    print(f"Generated {len(generated)} PDF(s) in {output_dir}:")
    for pdf_path in generated:
        size_kb = pdf_path.stat().st_size / 1024
        print(f"  {pdf_path.name} ({size_kb:.0f} KiB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
