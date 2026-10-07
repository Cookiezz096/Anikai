// AniList GraphQL Public Client
const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

const MEDIA_QUERY = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    startDate {
      year
      month
      day
    }
    description(asHtml: false)
    episodes
    duration
    status
    genres
    averageScore
    format
    studios(isMain: true) {
      nodes {
        name
      }
    }
    siteUrl
  }
}
`;

const SEARCH_QUERY = `
query ($search: String, $page: Int = 1, $perPage: Int = 12) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      hasNextPage
    }
    media (search: $search, type: ANIME, sort: POPULARITY_DESC) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      startDate {
        year
      }
      episodes
      status
      averageScore
      genres
    }
  }
}
`;

export async function fetchAniListAnime(id) {
  try {
    const response = await fetch(ANILIST_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: MEDIA_QUERY,
        variables: { id: parseInt(id, 10) },
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const data = await response.json();
    return data?.data?.Media || null;
  } catch (err) {
    console.error("Failed to fetch AniList details:", err);
    return null;
  }
}

export async function searchAniListAnime(searchQuery, page = 1) {
  try {
    const response = await fetch(ANILIST_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { search: searchQuery, page, perPage: 12 },
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList Search error: ${response.status}`);
    }

    const data = await response.json();
    return data?.data?.Page?.media || [];
  } catch (err) {
    console.error("Failed to search AniList:", err);
    return [];
  }
}
