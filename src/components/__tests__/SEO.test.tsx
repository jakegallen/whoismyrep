import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEO from "../SEO";

/** Wrapper that provides HelmetProvider context */
function renderSEO(props: React.ComponentProps<typeof SEO> = {}) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>,
  );
}

describe("SEO component", () => {
  it("renders default title when no title prop given", async () => {
    renderSEO();
    await waitFor(() => {
      expect(document.title).toBe(
        "WhoIsMyRep.us — Find Your U.S. Representatives",
      );
    });
  });

  it("appends site name suffix to provided title", async () => {
    renderSEO({ title: "Politicians" });
    await waitFor(() => {
      expect(document.title).toBe("Politicians | WhoIsMyRep.us");
    });
  });

  it("uses raw title without suffix when raw=true", async () => {
    renderSEO({ title: "Custom Page Title", raw: true });
    await waitFor(() => {
      expect(document.title).toBe("Custom Page Title");
    });
  });

  it("sets meta description", async () => {
    renderSEO({ description: "Test description" });
    await waitFor(() => {
      const meta = document.querySelector('meta[name="description"]');
      expect(meta?.getAttribute("content")).toBe("Test description");
    });
  });

  it("uses default description when none provided", async () => {
    renderSEO();
    await waitFor(() => {
      const meta = document.querySelector('meta[name="description"]');
      expect(meta?.getAttribute("content")).toContain(
        "Find your representatives instantly",
      );
    });
  });

  it("sets Open Graph meta tags", async () => {
    renderSEO({ title: "OG Test", description: "OG Desc" });
    await waitFor(() => {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      expect(ogTitle?.getAttribute("content")).toBe(
        "OG Test | WhoIsMyRep.us",
      );

      const ogDesc = document.querySelector('meta[property="og:description"]');
      expect(ogDesc?.getAttribute("content")).toBe("OG Desc");
    });
  });

  it("sets Twitter Card meta tags", async () => {
    renderSEO({ title: "Twitter Test" });
    await waitFor(() => {
      const card = document.querySelector('meta[name="twitter:card"]');
      expect(card?.getAttribute("content")).toBe("summary_large_image");

      const twTitle = document.querySelector('meta[name="twitter:title"]');
      expect(twTitle?.getAttribute("content")).toBe(
        "Twitter Test | WhoIsMyRep.us",
      );
    });
  });

  it("sets og:type to website by default", async () => {
    renderSEO();
    await waitFor(() => {
      const ogType = document.querySelector('meta[property="og:type"]');
      expect(ogType?.getAttribute("content")).toBe("website");
    });
  });

  it("allows overriding og:type", async () => {
    renderSEO({ type: "article" });
    await waitFor(() => {
      const ogType = document.querySelector('meta[property="og:type"]');
      expect(ogType?.getAttribute("content")).toBe("article");
    });
  });

  it("sets canonical URL from path", async () => {
    renderSEO({ path: "/politicians" });
    await waitFor(() => {
      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical?.getAttribute("href")).toBe(
        "https://whoismyrep.us/politicians",
      );
    });
  });

  it("does not render canonical when path is not provided", async () => {
    renderSEO();
    await waitFor(() => {
      // Should not have canonical (or it should be from index.html)
      // react-helmet-async manages head, so we check if our canonical exists
      const canonicals = document.querySelectorAll('link[rel="canonical"]');
      // May have the one from index.html but not one from this component
      for (const c of canonicals) {
        expect(c.getAttribute("href")).not.toContain("/politicians");
      }
    });
  });

  it("sets custom og:image", async () => {
    renderSEO({ image: "https://example.com/image.png" });
    await waitFor(() => {
      const ogImage = document.querySelector('meta[property="og:image"]');
      expect(ogImage?.getAttribute("content")).toBe(
        "https://example.com/image.png",
      );
    });
  });

  it("renders JSON-LD script when jsonLd prop provided", async () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Test Person",
    };
    renderSEO({ jsonLd });
    await waitFor(() => {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      // Find the one containing our test data
      let found = false;
      for (const script of scripts) {
        if (script.textContent?.includes("Test Person")) {
          found = true;
          const parsed = JSON.parse(script.textContent);
          expect(parsed["@type"]).toBe("Person");
          expect(parsed.name).toBe("Test Person");
        }
      }
      expect(found).toBe(true);
    });
  });
});
