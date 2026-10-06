import { getCashWallets } from '@/features/cash-wallets/actions/cash-wallets'
import { CashWalletList } from '@/features/cash-wallets/components/CashWalletList'

export const metadata = {
  title: 'Dompet Tunai | FinTrack',
}

export default async function CashWalletsPage() {
  const wallets = await getCashWallets()

  return <CashWalletList wallets={wallets} />
}
