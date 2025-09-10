import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { fetchBackend } from '../utils/fetchBackend'
import { useAdminLoggedInCheck } from '../utils/tryAdminLogin'
import { IconCheck } from '@tabler/icons-react'

export const Route = createFileRoute('/ScannerApp')({
  component: ScannerApp,
})

function ScannerApp() {
  const loggedIn = useAdminLoggedInCheck()
  const [checkShown, setCheckShown] = useState(false)
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const cooldownOn = useRef(false)
  const prevUserId = useRef(0)
  const loginM = useMutation({
    mutationFn: async (data: string) => {
      if (cooldownOn.current) return
      cooldownOn.current = true
      setTimeout(() => cooldownOn.current = false, 2000)

      const sep = data.indexOf(";")
      if (sep === -1) return "No semicolon separator; person was not signed in."
      const user_id = parseInt(data.substring(0, sep))
      const checkin_token = data.substring(sep + 1)

      if (prevUserId.current === user_id) return
      prevUserId.current = user_id

      console.log("USER ID: " + user_id)
      console.log("CHECKIN TOKEN: " + checkin_token)

      const res = await fetchBackend("/checkin/run/", {
        method: "POST",
        body: JSON.stringify({ user_id, checkin_token })
      })

      switch (res.status) {
        case 200:
          return null;
        case 400:
          return "Invalid Student ID - maybe refresh the webpage?"
        case 403:
          return "Heads up: sign-in qr codes change every 5 seconds, so you can't send a screenshot to your friend."
        case 405:
          return "There isn't a free block right now; try signing in later."
        default:
          return "Invalid status code: " + res.status
      }
    },
    onSuccess: (errMsg) => { 
      if (errMsg) {
        window.alert(errMsg) 
      } else {
        setCheckShown(true)
        setTimeout(() => setCheckShown(false), 500)
      }
    },
    onError: (err) => window.alert(err.toString())
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
