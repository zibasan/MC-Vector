export interface PluginSourceAdapter<SearchParams, SearchResult> {
  search(params: SearchParams): Promise<SearchResult>;
}
