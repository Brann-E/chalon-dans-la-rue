import { h } from "../dom.js";

/** Transforme adresses web et e-mails d'un texte en liens cliquables. */
const LINK = /(https?:\/\/[^\s)]*[^\s).,;:]|www\.[^\s)]*[^\s).,;:]|[\w.+-]+@[\w-]+\.[\w.-]*[\w])/g;

export function linkify(text) {
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const raw = match[0];
    nodes.push(text.slice(last, match.index));
    const isMail = raw.includes("@") && !raw.startsWith("http");
    const href = isMail ? `mailto:${raw}` : raw.startsWith("http") ? raw : `https://${raw}`;
    nodes.push(h("a", { href, target: isMail ? null : "_blank", rel: isMail ? null : "noopener" }, raw));
    last = match.index + raw.length;
  }
  nodes.push(text.slice(last));
  return nodes.filter((node) => node !== "");
}

/**
 * Blocs de texte d'une page (titres, paragraphes, listes), tels que produits par tools/scrape-pages.mjs.
 * Un titre suivi d'un autre titre, ou placé en fin de page, est ignoré (rubrique vide).
 * @param {{type: string, text?: string, items?: string[]}[]} blocks
 * @param {{skipFirstH1?: boolean}} [options]
 */
export function createBlocks(blocks, { skipFirstH1 = false } = {}) {
  const nodes = [];
  let h1Skipped = !skipFirstH1;
  blocks.forEach((block, index) => {
    const next = blocks[index + 1];
    if (block.type === "h1") {
      if (!h1Skipped) h1Skipped = true;
      else nodes.push(h("h2", { class: "prose__h2" }, block.text));
      return;
    }
    if (block.type === "h2" || block.type === "h3") {
      if (!next || next.type === "h1" || next.type === "h2" || next.type === "h3") return;
      nodes.push(h(block.type === "h2" ? "h2" : "h3", { class: block.type === "h2" ? "prose__h2" : "prose__h3" }, block.text));
    } else if (block.type === "ul") {
      nodes.push(h("ul", { class: "prose__list" }, block.items.map((item) => h("li", {}, linkify(item)))));
    } else {
      nodes.push(h("p", { class: "prose__p" }, linkify(block.text)));
    }
  });
  return h("div", { class: "prose" }, nodes);
}
