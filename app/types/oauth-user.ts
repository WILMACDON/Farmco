export interface GitHubAuthUser {
  id: number
  nickName: string
  email: string
  emailVerificationState: 'verified' | 'unverified'
  name: string
  avatarUrl: string
  original: GitHubOriginalUser
  token: GitHubToken
}

export interface GitHubOriginalUser {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: 'User'
  user_view_type: 'private' | 'public'
  site_admin: boolean
  name: string | null
  company: string | null
  blog: string | null
  location: string | null
  email: string | null
  hireable: boolean | null
  bio: string | null
  twitter_username: string | null
  notification_email: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string // ISO date
  updated_at: string // ISO date
  private_gists: number
  total_private_repos: number
  owned_private_repos: number
  disk_usage: number
  collaborators: number
  two_factor_authentication: boolean
  plan: GitHubPlan
}

export interface GitHubPlan {
  name: string
  space: number
  collaborators: number
  private_repos: number
}

export interface GitHubToken {
  token: string
  type: 'bearer'
  expiresIn?: number
  refreshToken?: string
  scope: string
}
export interface GoogleUser {
  id: string
  nickName: string
  name: string
  email: string
  avatarUrl: string
  emailVerificationState: string
  original: Original
  token: Token
}

export interface Original {
  sub: string
  name: string
  given_name: string
  family_name: string
  picture: string
  email: string
  email_verified: boolean
}

export interface Token {
  token: string
  type: string
  expiresIn: number
  expiresAt: Date
  scope: string
  id_token: string
  idToken: string
}
