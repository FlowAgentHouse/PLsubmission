"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react"
import { ethers } from "ethers"
import Link from "next/link"

const CONTRACT_ADDRESS = "0xD382f910789b8AEad4f41B5ea27e6E058c3f9cCf"

export default function ContractDebugPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>({})

  const checkContract = async () => {
    setLoading(true)
    const checks = {}

    // Test multiple RPC endpoints
    const rpcEndpoints = [
      {
        name: "Infura (Your Key)",
        url: "https://sepolia.infura.io/v3/0d4aa52670ca4855b637394cb6d0f9ab",
      },
      {
        name: "1RPC Public",
        url: "https://1rpc.io/sepolia",
      },
      {
        name: "Sepolia.org",
        url: "https://rpc.sepolia.org",
      },
    ]

    checks.rpcTests = []

    for (const rpc of rpcEndpoints) {
      const rpcResult = { name: rpc.name, url: rpc.url }
      try {
        console.log(`Testing RPC: ${rpc.url}`)
        const provider = new ethers.JsonRpcProvider(rpc.url)

        // Test network connection
        const network = await provider.getNetwork()
        rpcResult.network = {
          name: network.name,
          chainId: Number(network.chainId),
        }

        // Test latest block
        const blockNumber = await provider.getBlockNumber()
        rpcResult.latestBlock = blockNumber

        // Test contract existence
        const code = await provider.getCode(CONTRACT_ADDRESS)
        rpcResult.contractExists = code !== "0x"
        rpcResult.codeLength = code.length

        // If contract exists, test contract call
        if (rpcResult.contractExists) {
          const abi = ["function currentState() view returns (uint8)"]
          const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider)
          const state = await contract.currentState()
          rpcResult.contractCall = Number(state)
        }

        rpcResult.success = true
      } catch (err) {
        console.error(`RPC ${rpc.url} failed:`, err)
        rpcResult.success = false
        rpcResult.error = err.message
      }

      checks.rpcTests.push(rpcResult)
    }

    // Set the working RPC as primary
    const workingRpc = checks.rpcTests.find((rpc) => rpc.success && rpc.contractExists)
    if (workingRpc) {
      checks.primaryRpc = workingRpc
      checks.contractExists = true
    } else {
      checks.contractExists = false
      checks.error = "Contract not found on any RPC endpoint"
    }

    setResults(checks)
    setLoading(false)
  }

  useEffect(() => {
    checkContract()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Contract Debug</h1>
            <p className="text-gray-400">Testing multiple RPC endpoints</p>
          </div>
        </div>

        {/* Contract Address */}
        <Card className="bg-gray-800/50 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Contract Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Address:</span>
                <code className="text-yellow-400 bg-gray-700 px-2 py-1 rounded text-sm">{CONTRACT_ADDRESS}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Network:</span>
                <Badge variant="outline" className="border-blue-500 text-blue-400">
                  Ethereum Sepolia
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RPC Tests */}
        <Card className="bg-gray-800/50 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">RPC Endpoint Tests</CardTitle>
            <Button onClick={checkContract} disabled={loading} variant="outline">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-400" />
                <p className="text-gray-400 mt-2">Testing RPC endpoints...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.rpcTests?.map((rpc, index) => (
                  <Card key={index} className="bg-gray-700/50 border-gray-600">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white flex items-center">
                          {rpc.success ? (
                            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                          )}
                          {rpc.name}
                        </CardTitle>
                        {rpc.contractExists && <Badge className="bg-green-600 text-white">Contract Found</Badge>}
                      </div>
                      <code className="text-xs text-gray-400">{rpc.url}</code>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {rpc.success ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Network:</span>
                            <span className="text-green-400 ml-2">
                              {rpc.network?.name} (ID: {rpc.network?.chainId})
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Latest Block:</span>
                            <span className="text-green-400 ml-2">#{rpc.latestBlock}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Contract:</span>
                            <span className={`ml-2 ${rpc.contractExists ? "text-green-400" : "text-red-400"}`}>
                              {rpc.contractExists ? "Found" : "Not Found"}
                            </span>
                          </div>
                          {rpc.contractExists && (
                            <div>
                              <span className="text-gray-400">State:</span>
                              <span className="text-green-400 ml-2">{rpc.contractCall}</span>
                            </div>
                          )}
                          <div className="col-span-2">
                            <span className="text-gray-400">Code Length:</span>
                            <span className="text-yellow-400 ml-2">{rpc.codeLength} bytes</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-400 text-sm">{rpc.error}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gray-800/50 border-green-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300">
            {results.contractExists ? (
              <>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <span>Contract found and working on {results.primaryRpc?.name}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <span>Current game state: {results.primaryRpc?.contractCall}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <span>Ready to play!</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <span>Contract not found on any RPC endpoint</span>
                </div>
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <span>Please verify the contract address and deployment</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
