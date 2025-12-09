import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface ChangelogEntry {
  slug: string;
  title: string;
  date: string | Date;
  content: string;
}

export function getChangelogEntries(): ChangelogEntry[] {
  const changelogDir = path.join(process.cwd(), "src/content/changelog");

  if (!fs.existsSync(changelogDir)) {
    return [];
  }

  const files = fs.readdirSync(changelogDir).filter((file) => file.endsWith(".md"));

  const entries = files.map((file) => {
    const filePath = path.join(changelogDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    return {
      slug: file.replace(".md", ""),
      title: data.title || "Update",
      date: data.date || file.replace(".md", ""),
      content: content.trim(),
    };
  });

  // Sort by date descending (newest first)
  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
