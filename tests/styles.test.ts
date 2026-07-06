import { describe, expect, it } from "vitest";
import { STYLES } from "../src/content/styles";

describe("tool window animation", () => {
  it("does not restart the entrance animation when interaction ends", () => {
    const interactionRule = /\.panel\.interacting[^{]*\{([^}]*)\}/u.exec(STYLES);
    expect(interactionRule?.[1] ?? "").not.toContain("animation");
    expect(STYLES).toContain(".panel.no-animation{animation:none}");
  });
});
