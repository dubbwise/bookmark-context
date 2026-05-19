import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CollectionFaviconStack from "./CollectionFaviconStack";

describe("CollectionFaviconStack", () => {
  it("shows album icon when there are no previews", () => {
    const { container } = render(<CollectionFaviconStack previews={[]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders at most four favicon images", () => {
    const previews = Array.from({ length: 6 }, (_, i) => ({
      url: `https://site${i}.com`,
      favicon_url: `https://site${i}.com/favicon.ico`,
    }));
    const { container } = render(<CollectionFaviconStack previews={previews} />);
    expect(container.querySelectorAll("img")).toHaveLength(4);
  });
});
