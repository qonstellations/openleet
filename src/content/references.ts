const GRAPHQL_ENDPOINT = "https://leetcode.com/graphql/";

const OFFICIAL_SOLUTION_QUERY = `
query officialSolution($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    solution {
      title
      content
      paidOnly
      canSeeDetail
      topic {
        solutionTags {
          name
          slug
        }
      }
    }
  }
}`;

const COMMUNITY_SOLUTIONS_QUERY = `
query communitySolutions($questionSlug: String!, $skip: Int!, $first: Int!, $orderBy: TopicSortingOption) {
  questionSolutions(
    filters: {
      questionSlug: $questionSlug
      skip: $skip
      first: $first
      orderBy: $orderBy
      languageTags: []
      topicTags: []
      query: ""
    }
  ) {
    solutions {
      title
      solutionTags {
        name
        slug
      }
      post {
        voteCount
      }
      searchMeta {
        content
      }
    }
  }
}`;

type FetchLike = typeof fetch;

export async function fetchSolutionReferences(
  slug: string,
  fetcher: FetchLike = fetch
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  const [official, community] = await Promise.all([
    graphql(fetcher, controller.signal, "officialSolution", OFFICIAL_SOLUTION_QUERY, { titleSlug: slug }),
    graphql(fetcher, controller.signal, "communitySolutions", COMMUNITY_SOLUTIONS_QUERY, {
      questionSlug: slug,
      skip: 0,
      first: 3,
      orderBy: "hot"
    })
  ]).finally(() => clearTimeout(timeout));

  const sections: string[] = [];
  const solution = record(record(official, "data"), "question")?.solution;
  if (isRecord(solution) && solution.canSeeDetail !== false && typeof solution.content === "string") {
    const tags = solutionTags(record(solution, "topic")?.solutionTags);
    sections.push([
      "SOURCE: Official LeetCode editorial",
      typeof solution.title === "string" ? `Title: ${solution.title}` : "",
      tags ? `Tags: ${tags}` : "",
      referenceExcerpt(solution.content, 7_000)
    ].filter(Boolean).join("\n"));
  }

  const solutions = record(record(community, "data"), "questionSolutions")?.solutions;
  if (Array.isArray(solutions)) {
    solutions.slice(0, 3).forEach((item, index) => {
      if (!isRecord(item)) return;
      const content = record(item, "searchMeta")?.content;
      if (typeof content !== "string" || !content.trim()) return;
      const tags = solutionTags(item.solutionTags);
      sections.push([
        `SOURCE: Hot community solution ${index + 1}`,
        typeof item.title === "string" ? `Title: ${item.title}` : "",
        tags ? `Tags: ${tags}` : "",
        referenceExcerpt(content, 2_500)
      ].filter(Boolean).join("\n"));
    });
  }

  return sections.join("\n\n---\n\n").slice(0, 15_000);
}

async function graphql(
  fetcher: FetchLike,
  signal: AbortSignal,
  operationName: string,
  query: string,
  variables: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const response = await fetcher(GRAPHQL_ENDPOINT, {
      method: "POST",
      signal,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-operation-name": operationName
      },
      body: JSON.stringify({ operationName, query, variables })
    });
    if (!response.ok) return {};
    const payload: unknown = await response.json();
    return isRecord(payload) ? payload : {};
  } catch {
    return {};
  }
}

export function referenceExcerpt(content: string, maxChars: number): string {
  const text = htmlToText(content);
  const units = text.split(/\n+|(?<=[.!?])\s+/u).filter(Boolean);
  const selected = units.filter((unit) =>
    /\b(approach|algorithm|complexit|optimal|time|space)\b|O\s*\([^)]{1,40}\)/iu.test(unit)
  );
  return (selected.length ? selected.join("\n") : text).slice(0, maxChars);
}

function htmlToText(content: string): string {
  return content
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|pre|section)>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/giu, (entity) => ({
      "&nbsp;": " ",
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'"
    })[entity.toLowerCase()] ?? " ")
    .replace(/[ \t]+/gu, " ")
    .replace(/\n\s+/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function solutionTags(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((tag) => isRecord(tag) && typeof tag.name === "string" ? tag.name : "")
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
}

function record(value: unknown, key: string): Record<string, any> | undefined {
  if (!isRecord(value)) return undefined;
  const nested = value[key];
  return isRecord(nested) ? nested : undefined;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
