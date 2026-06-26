import type { SteamUser } from '../types.js'

export function steamLoginUrl(returnUrl: string): string {
  const realm = new URL(returnUrl).origin
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })
  return `https://steamcommunity.com/openid/login?${params}`
}

export async function verifySteamLogin(url: URL, db: D1Database): Promise<SteamUser | null> {
  const claimedId = url.searchParams.get('openid.claimed_id')
  if (!claimedId) return null
  const steamId = extractSteamId(claimedId)
  if (!steamId) return null

  const verifyParams = new URLSearchParams(url.searchParams)
  verifyParams.set('openid.mode', 'check_authentication')
  const resp = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  })
  const text = await resp.text()
  if (!text.includes('is_valid:true')) return null

  const configRow = await db.prepare('SELECT value FROM config WHERE key = ?').bind('STEAM_API_KEY').first<{ value: string }>()
  const apiKey = configRow?.value
  if (!apiKey) return null

  const userResp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`)
  const userData = await userResp.json() as { response?: { players?: Array<{ steamid: string; personaname: string; avatar: string }> } }
  const player = userData.response?.players?.[0]
  return player ? { steamid: player.steamid, personaname: player.personaname, avatar: player.avatar } : null
}

function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(/\/(?:id|profiles)\/(\d+)/)
  return match ? match[1] : null
}
