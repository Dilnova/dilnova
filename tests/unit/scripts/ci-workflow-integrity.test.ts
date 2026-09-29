import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("CI Workflow Security & Integrity", () => {
  const ciWorkflowPath = path.resolve(process.cwd(), ".github/workflows/ci.yml");

  it("verifies CI workflow file exists", () => {
    expect(fs.existsSync(ciWorkflowPath)).toBe(true);
  });

  it("ensures Gitleaks binary download verifies official SHA256 checksum", () => {
    const ciContent = fs.readFileSync(ciWorkflowPath, "utf-8");

    // Must define Gitleaks version and SHA256
    expect(ciContent).toContain('GITLEAKS_VERSION="8.28.0"');
    expect(ciContent).toContain(
      'GITLEAKS_SHA256="a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb"',
    );

    // Must verify with sha256sum --check before extracting
    expect(ciContent).toMatch(
      /echo "\$\{GITLEAKS_SHA256\}\s+gitleaks\.tar\.gz" \| sha256sum --check/,
    );

    // Extraction must only happen after verification
    const shaIndex = ciContent.indexOf("sha256sum --check");
    const tarIndex = ciContent.indexOf("tar -xzf gitleaks.tar.gz");
    expect(shaIndex).toBeGreaterThan(-1);
    expect(tarIndex).toBeGreaterThan(shaIndex);
  });

  it("ensures all third-party GitHub Actions are pinned to commit SHA hashes", () => {
    const ciContent = fs.readFileSync(ciWorkflowPath, "utf-8");
    const usesLines = ciContent
      .split("\n")
      .filter((line) => line.trim().startsWith("uses:"))
      .map((line) => line.trim());

    for (const line of usesLines) {
      // Local action references like ./.github/actions/setup-env are allowed
      if (line.includes("./.github/actions")) continue;

      // Third-party actions must use @<40-char-sha>
      const match = line.match(/uses:\s*([\w\-./]+)@([a-f0-9]{40})/);
      expect(
        match,
        `Expected third-party action in "${line}" to be pinned to full 40-character commit SHA`,
      ).toBeTruthy();
    }
  });
});
