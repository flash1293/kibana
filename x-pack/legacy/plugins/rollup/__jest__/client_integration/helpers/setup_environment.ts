/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface RequestMocks {
  jobs: object;
  createdJob: object;
  indxPatternVldtResp: object;
}

const mockHttpRequest = (
  http: any,
  {
    jobs = {},
    createdJob = {},
    indxPatternVldtResp = {},
  }: RequestMocks | { [key: string]: any } = {}
) => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/api/rollup/jobs') {
      return jobs;
    }

    if (url.startsWith('/api/rollup/index_pattern_validity')) {
      return {
        doesMatchIndices: true,
        doesMatchRollupIndices: false,
        dateFields: ['foo', 'bar'],
        numericFields: [],
        keywordFields: [],
        ...indxPatternVldtResp,
      };
    }

    return {};
  });

  // mock '/api/rollup/start'
  http.post.mockImplementation(async (url: string) => ({}));

  // mock '/api/rollup/create
  http.put.mockImplementation(async (url: string) => createdJob);
};

export { mockHttpRequest };
