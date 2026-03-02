import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialIcons } from "./SocialIcons";

describe("SocialIcons", () => {
  it("returns null when no handles are provided", () => {
    const { container } = render(<SocialIcons />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when handles object is empty", () => {
    const { container } = render(<SocialIcons socialHandles={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders website link with https:// prefix for bare domains", () => {
    render(<SocialIcons socialHandles={{ website: "cruz.senate.gov" }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://cruz.senate.gov");
  });

  it("renders website link as-is when protocol already included", () => {
    render(<SocialIcons socialHandles={{ website: "https://pelosi.house.gov" }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://pelosi.house.gov");
  });

  it("renders email link with mailto: prefix", () => {
    render(<SocialIcons socialHandles={{ email: "senator@example.com" }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "mailto:senator@example.com");
  });

  it("renders X handle with correct URL", () => {
    render(<SocialIcons socialHandles={{ x: "SenatorSmith" }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://x.com/SenatorSmith");
  });

  it("renders multiple platforms in correct order", () => {
    render(
      <SocialIcons
        socialHandles={{
          youtube: "UCchannel",
          x: "handle",
          website: "example.com",
        }}
      />,
    );
    const links = screen.getAllByRole("link");
    // Order: website → x → youtube
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "https://example.com");
    expect(links[1]).toHaveAttribute("href", "https://x.com/handle");
    expect(links[2]).toHaveAttribute("href", "https://youtube.com/@UCchannel");
  });

  it("renders small size icons without labels", () => {
    render(
      <SocialIcons
        size="sm"
        socialHandles={{ x: "handle", facebook: "page" }}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    // Small size should not have visible label text (just icon)
    links.forEach((link) => {
      expect(link.querySelector("span")).toBeNull();
    });
  });

  it("ignores unknown platform keys", () => {
    render(
      <SocialIcons
        socialHandles={{ x: "handle", snapchat: "user123" } as any}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
  });

  it("renders links with target=_blank and rel=noopener", () => {
    render(<SocialIcons socialHandles={{ facebook: "page" }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
