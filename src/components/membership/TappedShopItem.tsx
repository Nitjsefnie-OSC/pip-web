'use client'

// The shop item somebody tapped, named under "The members' shelf": its own line
// from the shop, and whether it comes with the membership or the membership
// lets you buy it. The feature's blurb covers sixteen things, so without this
// the page answered a tap on Marble with the whole shelf.
//
// Loaded on its own (`next/dynamic` in TappedFor), so the shop's registries
// reach the browser only for somebody who tapped a locked item.

import { tappedShopItem, tappedShopLine } from '@/config/shop'
import { useMoney } from '@/lib/useMoney'

export function TappedShopItem({ search }: { search: string }) {
  const money = useMoney()
  const item = tappedShopItem(search)
  if (!item) return null

  return (
    <p className="mt-3 leading-relaxed text-muted-foreground">
      You tapped <span className="font-medium text-foreground">{item.name}</span>
      {tappedShopLine(item, money)}
    </p>
  )
}
