import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { IconCheck } from '../components/icons.tsx'
import { fetchBackend } from '../utils/fetchBackend'
import { useAdminLoggedInCheck } from '../utils/tryAdminLogin'

export const Route = createFileRoute('/ScannerApp')({
  component: ScannerApp,
})

interface ScanResult {
  status: "ok" | "err" | "skipped"
  msg?: string
}

function ScannerApp() {
  const loggedIn = useAdminLoggedInCheck()
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const cooldownOn = useRef(false)
  const prevUserId = useRef(0)
  const [checkShown, setCheckShown] = useState(false)

  function onError(err: string) {
    window.alert(err) 
    cooldownOn.current = false;
    prevUserId.current = 0
  }

  const loginM = useMutation<ScanResult, Error, string>({
    mutationFn: async (data) => {
      if (cooldownOn.current) return { status: "skipped" }
      cooldownOn.current = true
      setTimeout(() => cooldownOn.current = false, 2000)

      const sep = data.indexOf(";")
      if (sep === -1) {
        return { status: "err", msg: "No semicolon separator; person was not signed in." }
      }
      const user_id = parseInt(data.substring(0, sep))
      const checkin_token = data.substring(sep + 1)

      if (prevUserId.current === user_id) return { status: "skipped" }
      prevUserId.current = user_id

      console.log("USER ID: " + user_id)
      console.log("CHECKIN TOKEN: " + checkin_token)

      const res = await fetchBackend("/checkin/run/", {
        method: "POST",
        body: JSON.stringify({ user_id, checkin_token })
      })

      switch (res.status) {
        case 200:
          return { status: "ok" }
        case 400:
          return { status: "err", msg: "Invalid Student ID - maybe refresh the webpage?" }
        case 403:
          return { status: "err", msg: "Heads up: sign-in qr codes change every 5 seconds, so you can't send a screenshot to your friend." }
        case 405:
          return { status: "err", msg: "There isn't a free block right now; try signing in later." }
        default:
          return { status: "err", msg: "Invalid status code: " + res.status }
      }
    },
    onError: (err) => onError(err.toString()),
    onSuccess: (result) => { 
      if (result.status === "err") {
        onError(result.msg ?? "Invalid Error")
      } else if (result.status === "ok") {
        setCheckShown(true)
        setTimeout(() => setCheckShown(false), 500)
      }
    },
  })

  useEffect(() => {
    if (loggedIn.isFetching || vidRef.current == null) return
    const scanner = new QrScanner(
      vidRef.current, (res) => loginM.mutate(res.data),
      { highlightScanRegion: true }
    )
    scanner.start()
  }, [vidRef.current, loggedIn.isFetching])

  if (loggedIn.isFetching) {
    return <div>Loading....</div>
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div>Should be here</div>
      <video ref={vidRef} style={{ width: '100%', height: '100%' }}></video>
      {
        checkShown &&
        <IconCheck color="green" size="100" style={indicatorStyle} />
      }
    </div>
  )
}

const indicatorStyle: CSSProperties = {
  position: 'absolute',
  top: '10%',
  left: '45%',
  zIndex: 2,
  pointerEvents: 'none'
}
