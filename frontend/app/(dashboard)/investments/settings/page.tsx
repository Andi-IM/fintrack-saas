'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, RefreshCw, Database, Shield, Palette, Bell, Trash2, Download, Upload, Settings } from 'lucide-react'
import { toast } from 'sonner'

export default function InvestmentsSettingsPage() {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(300000) // 5 minutes
  const [showGainLossColors, setShowGainLossColors] = useState(true)
  const [compactMode, setCompactMode] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [priceAlerts, setPriceAlerts] = useState(false)
  const [dividendAlerts, setDividendAlerts] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // In a real app, this would fetch all data and generate a CSV/JSON export
      const response = await fetch('/api/investments/export')
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-investments-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Investment data exported successfully')
    } catch {
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/investments/import', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Import failed')
      toast.success('Investment data imported successfully')
      window.location.reload()
    } catch {
      toast.error('Failed to import data')
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const handleRefreshPrices = async () => {
    try {
      const response = await fetch('/api/investments/refresh-prices', { method: 'POST' })
      if (!response.ok) throw new Error('Refresh failed')
      toast.success('Prices refreshed successfully')
    } catch {
      toast.error('Failed to refresh prices')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investment Settings</h1>
        <p className="text-muted-foreground">Configure your investment tracking preferences</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General
          </CardTitle>
          <CardDescription>Basic investment tracking preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto Refresh Prices</Label>
              <p className="text-sm text-muted-foreground">
                Automatically fetch latest prices in the background
              </p>
            </div>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Refresh Interval</Label>
              <p className="text-sm text-muted-foreground">
                How often to fetch new prices (when auto refresh is enabled)
              </p>
            </div>
            <Select value={refreshInterval.toString()} onValueChange={e => setRefreshInterval(Number(e))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60000">1 minute</SelectItem>
                <SelectItem value="300000">5 minutes</SelectItem>
                <SelectItem value="900000">15 minutes</SelectItem>
                <SelectItem value="1800000">30 minutes</SelectItem>
                <SelectItem value="3600000">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Show Gain/Loss Colors</Label>
              <p className="text-sm text-muted-foreground">
                Display green/red colors for positive/negative returns
              </p>
            </div>
            <Switch
              checked={showGainLossColors}
              onCheckedChange={setShowGainLossColors}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Compact Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use smaller spacing and fonts for dense data display
              </p>
            </div>
            <Switch
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure price and portfolio alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive browser notifications for important events
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Price Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Notify when holdings move significantly (5%+ daily change)
              </p>
            </div>
            <Switch
              checked={priceAlerts}
              onCheckedChange={setPriceAlerts}
              disabled={!notificationsEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Dividend Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Notify when dividends or distributions are received
              </p>
            </div>
            <Switch
              checked={dividendAlerts}
              onCheckedChange={setDividendAlerts}
              disabled={!notificationsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Display
          </CardTitle>
          <CardDescription>Customize how investment data is presented</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select defaultValue="IDR">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR (Indonesian Rupiah)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number Format</Label>
              <Select defaultValue="id-ID">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id-ID">Indonesian (1.234,56)</SelectItem>
                  <SelectItem value="en-US">US (1,234.56)</SelectItem>
                  <SelectItem value="en-GB">UK (1,234.56)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export, import, or reset your investment data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Export Data</Label>
              <p className="text-sm text-muted-foreground">
                Download all your investment data as JSON (accounts, holdings, transactions, prices)
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </>
              )}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Import Data</Label>
              <p className="text-sm text-muted-foreground">
                Upload a previously exported JSON file to restore your data
              </p>
            </div>
            <label className="cursor-pointer">
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import JSON
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Refresh Prices Now</Label>
              <p className="text-sm text-muted-foreground">
                Manually trigger a price fetch for all your holdings
              </p>
            </div>
            <Button variant="outline" onClick={handleRefreshPrices}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that delete your data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              The actions below will permanently delete your investment data. This cannot be undone.
              Make sure you have exported a backup before proceeding.
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-1">
              <Label className="text-destructive">Delete All Investment Data</Label>
              <p className="text-sm text-muted-foreground">
                Remove all accounts, holdings, transactions, and price history
              </p>
            </div>
            <Button variant="destructive" className="bg-destructive/10 border-destructive/20 hover:bg-destructive/20">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Everything
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            About
          </CardTitle>
          <CardDescription>Investment tracking feature information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium">Version</p>
              <p>1.0.0</p>
            </div>
            <div>
              <p className="font-medium">Data Source</p>
              <p>Yahoo Finance, CoinGecko, Binance, ANTAM</p>
            </div>
            <div>
              <p className="font-medium">Supported Assets</p>
              <p>Stocks, Mutual Funds, Crypto, Gold, Commodities</p>
            </div>
            <div>
              <p className="font-medium">Update Frequency</p>
              <p>Real-time (crypto), 15min (stocks), Daily (funds), Hourly (gold)</p>
            </div>
          </div>
          <Separator />
          <p>
            Investment tracking data is stored securely in your Supabase database with Row Level Security.
            Price data is fetched from public APIs and cached. Past performance does not guarantee future results.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}