export const authInfo = {
  sessionJwt:
    'eyJhbGciOiJFUzM4NCIsImtpZCI6IlAyRWRVdjlMdmpPWUVHNHg4VVVGTGpTYUl1S0oiLCJ0eXAiOiJKV1QifQ.eyJkcm4iOiJEUyIsImV4cCI6MTY2MzE5MDQ2OCwiaWF0IjoxNjYzMTg5ODY4LCJpc3MiOiJQMkVkVXY5THZqT1lFRzR4OFVVRkxqU2FJdUtKIiwic3ViIjoiVTJFZFkzd081ZkZrdmFXTGRucGpBNlNLMlRwNSIsInRlbmFudHMiOnsiQzJFZFk0VVhYektQVjBFS2RaRkpidUtLbXZ0bCI6e319fQ.drI4qSg2WoAFprJU0By5A3bXCQBh2Jo-dWT16mlib3eC_ccOoQcGckWC3sfaPAIjUdFMVaOnPpP-PMnlezo-laz3-tqjT8iTfP19G3m8IfbcOE02fScOgAVyyz_9FRoc',
  refreshJwt:
    'eyJhbGciOiJFUzM4NCIsImtpZCI6IlAyRWRVdjlMdmpPWUVHNHg4VVVGTGpTYUl1S0oiLCJ0eXAiOiJKV1QifQ.eyJkcm4iOiJEU1IiLCJleHAiOjE2NjU1NzY3MjAsImlhdCI6MTY2MzE1NzUyMCwiaXNzIjoiUDJFZFV2OUx2ak9ZRUc0eDhVVUZMalNhSXVLSiIsInN1YiI6IlUyRWRZM3dPNWZGa3ZhV0xkbnBqQTZTSzJUcDUiLCJ0ZW5hbnRzIjp7IkMyRWRZNFVYWHpLUFYwRUtkWkZKYnVLS212dGwiOnt9fX0.TWByLN6h3KT58z3AhAchLwaPnUVrDxKwJtU0DbowrJJ9w4B8QzINI3GSE92ykedapAf64am4_QcMJc93kxQ3HgKiUqWKmAST9mlphix6Z6wZ8Cl6z_X3Dk60e_DMoh2s',
  cookieDomain: 'domain1',
  cookiePath: '/path1',
  cookieExpiration: 1665576720,
  user: { name: 'john', loginIds: ['js@hotmail.com'] },
  sessionExpiration: 1663190468,
  claims: {
    amr: ['email'],
  },
};

export const flowResponse = {
  authInfo,
  status: 'running',
};

export const completedFlowResponseWithNoName = {
  authInfo: {
    user: { loginIds: ['js@hotmail.com'] },
  },
  status: 'completed',
};

export const completedFlowResponse = {
  authInfo,
  status: 'completed',
};

export const mockFingerprint = {
  vsid: 'local-session-id',
  vrid: 'local-request-id',
};

export const oidcAuthInfo = {
  access_token:
    'eyJhbGciOiJFUzM4NCIsImtpZCI6IlAyRWRVdjlMdmpPWUVHNHg4VVVGTGpTYUl1S0oiLCJ0eXAiOiJKV1QifQ.eyJkcm4iOiJEUyIsImV4cCI6MTY2MzE5MDQ2OCwiaWF0IjoxNjYzMTg5ODY4LCJpc3MiOiJQMkVkVXY5THZqT1lFRzR4OFVVRkxqU2FJdUtKIiwic3ViIjoiVTJFZFkzd081ZkZrdmFXTGRucGpBNlNLMlRwNSIsInRlbmFudHMiOnsiQzJFZFk0VVhYektQVjBFS2RaRkpidUtLbXZ0bCI6e319fQ.drI4qSg2WoAFprJU0By5A3bXCQBh2Jo-dWT16mlib3eC_ccOoQcGckWC3sfaPAIjUdFMVaOnPpP-PMnlezo-laz3-tqjT8iTfP19G3m8IfbcOE02fScOgAVyyz_9FRoc',
  refresh_token:
    'eyJhbGciOiJFUzM4NCIsImtpZCI6IlAyRWRVdjlMdmpPWUVHNHg4VVVGTGpTYUl1S0oiLCJ0eXAiOiJKV1QifQ.eyJkcm4iOiJEU1IiLCJleHAiOjE2NjU1NzY3MjAsImlhdCI6MTYzMTU3NTIwLCJpc3MiOiJQMkVkVXY5THZqT1lFRzR4OFVVRkxqU2FJdUtKIiwic3ViIjoiVTJFZFkzd081ZkZrdmFXTGRucGpBNlNLMlRwNSIsInRlbmFudHMiOnsiQzJFZFk0VVhYektQVjBFS2RaRkpidUtLbXZ0bCI6e319fQ.TWByLN6h3KT58z3AhAchLwaPnUVrDxKwJtU0DbowrJJ9w4B8QzINI3GSE92ykedapAf64am4_QcMJc93kxQ3HgKiUqWKmAST9mlphix6Z6wZ8Cl6z_X3Dk60e_DMoh2s',
  id_token:
    'eyJhbGciOiJFUzM4NCIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.MjkzODM4MjkzODMyOTM4MjkzODI5MzgyOTM4',
  expires_in: 600, // 10 minutes
  refresh_expire_in: 2419200, // 28 days
  user: authInfo.user,
};
