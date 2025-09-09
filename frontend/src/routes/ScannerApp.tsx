import { createFileRoute } from '@tanstack/react-router'
import { useAdminLoggedInCheck } from '../utils/tryAdminLogin'
import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { useMutation } from '@tanstack/react-query'
import { BACKEND_URL } from '../utils/constants'

export const Route = createFileRoute('/ScannerApp')({
  component: ScannerApp,
})

function ScannerApp() {
  const loggedIn = useAdminLoggedInCheck()
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const cooldownOn = useRef(false)
  const previousData = useRef("")
  const loginM = useMutation({
    mutationFn: async (data: string) => {
      const sep = data.indexOf(";")
      if (sep === -1) return "No semicolon separator; person was not signed in."
      const user_id = parseInt(data.substring(0, sep))
      const checkin_token = data.substring(sep + 1)
      const res = await fetch(BACKEND_URL + "/checkin/run/", {
        method: "POST",
        body: JSON.stringify({ user_id, checkin_token })
      })
      if (res.status === 200) return null
      return "Invalid status: " + res.status
    },
    onSuccess: (errMsg) => {
      if (errMsg) window.alert("Error occured while scanning: " + errMsg)
    },
    onError: (err) => window.alert("Error occured while scanning: " + err.toString())
  })

  function handleResult(result: string) {
    if (cooldownOn.current || result === previousData.current) return
    console.log("running!")
    cooldownOn.current = true
    previousData.current = result
    setTimeout(() => cooldownOn.current = false, 2000)
    loginM.mutate(result)
  }

  useEffect(() => {
    if (loggedIn.isFetching || vidRef.current == null) return
    const scanner = new QrScanner(
      vidRef.current, res => handleResult(res.data),
      {
        highlightScanRegion: true
      }
    )
    scanner.start()
  }, [vidRef.current, loggedIn.isFetching])

  if (loggedIn.isFetching) {
    return <div>Loading....</div>
  }

  return (
    <div>
      <div>Should be here</div>
      <video ref={vidRef}></video>
    </div>
  )
}
