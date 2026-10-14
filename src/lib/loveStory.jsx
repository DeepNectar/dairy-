import { jsx, jsxs } from "react/jsx-runtime";
import { resolveImageUrl, RobustImg } from "./images";
const HEADER_PHOTO_LINK = "https://drive.google.com/file/d/17_Wt5nHtKbuDc7DiynDexI-l-GY8RpgS/view?usp=sharing";
const SIGNATURE_LINKS = [
  "https://drive.google.com/file/d/1KnoE8uWAwugB0PRMiPmq32eCW-ZxMasj/view?usp=drive_link",
  "https://drive.google.com/file/d/1XSSbL_JtTqYNwxJ_xquwQj5c5daeMm1V/view?usp=drive_link"
];
const headerPhotoSrc = resolveImageUrl(HEADER_PHOTO_LINK, 900);
const signatureSrcs = SIGNATURE_LINKS.map((l) => resolveImageUrl(l, 700));
// Inline (element.style) sizing — applied directly on the <img> elements so the
// header photo and footer signatures stay small & perfectly fitted EVEN IF an
// external/bundled stylesheet overrides the rules in src/index.css. Inline
// styles beat any class-based CSS, so the bands can never grow oversized.
const FIXED_HEADER_IMG_STYLE = {
  width: "16mm",
  height: "16mm",
  maxWidth: "16mm",
  maxHeight: "16mm",
  objectFit: "cover",
  display: "block"
};
const FIXED_SIGN_IMG_STYLE = {
  width: "auto",
  height: "10mm",
  maxWidth: "42mm",
  maxHeight: "10mm",
  objectFit: "contain",
  display: "block",
  margin: "0 auto"
};
const FIXED_HEADER_BAND_STYLE = {
  alignItems: "center",
  gap: "2.5mm",
  marginBottom: "1.5mm",
  paddingBottom: "1.2mm"
};
const FIXED_HEADER_PHOTO_BOX_STYLE = {
  flex: "0 0 16mm",
  width: "16mm",
  height: "16mm",
  maxWidth: "16mm",
  maxHeight: "16mm",
  overflow: "hidden"
};
const FIXED_FOOTER_BAND_STYLE = {
  alignItems: "flex-end",
  gap: "4mm",
  marginTop: "1.5mm",
  paddingTop: "1mm"
};
const FIXED_SIGN_BOX_STYLE = {
  flex: "0 1 auto",
  width: "42mm",
  maxWidth: "42mm",
  height: "10mm",
  maxHeight: "10mm",
  overflow: "hidden"
};
function LoveStoryHeader() {
  return /* @__PURE__ */ jsxs("div", { className: "ls-header", style: FIXED_HEADER_BAND_STYLE, children: [
    /* @__PURE__ */ jsx("div", { className: "ls-header-photo", style: FIXED_HEADER_PHOTO_BOX_STYLE, children: /* @__PURE__ */ jsx(RobustImg, { src: HEADER_PHOTO_LINK, widthHint: 900, alt: "us", draggable: false, style: FIXED_HEADER_IMG_STYLE }) }),
    /* @__PURE__ */ jsxs("div", { className: "ls-header-text", children: [
      /* @__PURE__ */ jsx("h1", { className: "ls-title", children: "\u{1F495} OUR LOVE STORY \u{1F495}" }),
      /* @__PURE__ */ jsxs("p", { className: "ls-sub", children: [
        "\u{1F36F}\u{1FAF0}\u{1FAF6}\u{1F3FB} Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618} & Shinu \u{1F48F}\u{1F444}\u{1FAE6}",
        " ",
        /* @__PURE__ */ jsx("span", { className: "ls-dash", children: "----" }),
        " \u2728Two Bodies, One Soul\u2728"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "ls-meta", children: [
        "Started: 16th December 2025\u23F010:19 AM (UAE)",
        " ",
        /* @__PURE__ */ jsx("span", { className: "ls-dash", children: "----" }),
        " \u{1F319}Dubai\u2708\uFE0F \u{1F54C} Nadiad \u{1F33A}"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "ls-quote", children: "This distance is painful\u2026 but it's also proof\u2014that what we have is real." })
    ] })
  ] });
}
function LoveStoryFooter() {
  return /* @__PURE__ */ jsxs("div", { className: "ls-footer", style: FIXED_FOOTER_BAND_STYLE, children: [
    /* @__PURE__ */ jsx("div", { className: "ls-sign", style: FIXED_SIGN_BOX_STYLE, children: /* @__PURE__ */ jsx(RobustImg, { src: SIGNATURE_LINKS[0], widthHint: 700, alt: "signature", draggable: false, style: FIXED_SIGN_IMG_STYLE }) }),
    /* @__PURE__ */ jsx("div", { className: "ls-sign", style: FIXED_SIGN_BOX_STYLE, children: /* @__PURE__ */ jsx(RobustImg, { src: SIGNATURE_LINKS[1], widthHint: 700, alt: "signature", draggable: false, style: FIXED_SIGN_IMG_STYLE }) })
  ] });
}
export {
  HEADER_PHOTO_LINK,
  LoveStoryFooter,
  LoveStoryHeader,
  SIGNATURE_LINKS,
  headerPhotoSrc,
  signatureSrcs
};
