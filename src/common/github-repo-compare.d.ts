// See https://developer.github.com/v3/repos/commits/#compare-two-commits

export interface GithubRepoCompareResponse {
    url: string;
    html_url: string;
    permalink_url: string;
    diff_url: string;
    patch_url: string;
    base_commit: any;
    merge_base_commit: any;
    status: string;
    ahead_by: number;
    behind_by: number;
    total_commits: number;
    commits: any;
    files: GithubRepoCompareFile[];
}

export interface GithubRepoCompareFile {
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    patch: string;
}