import { Button, Modal, Stack, TextInput, Title } from '@mantine/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchBackend } from '../api/fetchBackend'
import { SignInButton } from './SignInButton'
import { type ModeOption, parseCheckInRes } from '../api/checkIn'
import { ModeSelectComponent } from './ModeSelect'
import { IconCheck } from './icons'

interface ManualCheckInProps { 
  open: boolean,
  setOpen: (opened: boolean) => void,
}

export default function ManualCheckInModal(props: ManualCheckInProps) {
  const [studentId, setStudentId] = useState("")
  const [mode, setMode] = useState<ModeOption>('free_period');
  const [shouldReset, setShouldReset] = useState(false);

  const qClient = useQueryClient()
  const checkinQ = useQuery({
    queryKey: ["manualCheckIn"],
    queryFn: async () => {
      if (studentId === "") {
        return
      }
      setShouldReset(false)
      const idAsNum = parseInt(studentId)
      if (Number.isNaN(idAsNum)) {
        window.alert("Invalid student ID")
        return false
      }
      const res = await parseCheckInRes(
        await fetchBackend("/checkin/runManual/", {
          method: "POST",
          credentials: 'include',
          body: JSON.stringify({ student_id: idAsNum, mode })
        })
      )
      if (res.status === "ok") {
        return res.studentName
      } else if (res.status === "err") {
        window.alert(res.msg)
        return null
      }
    },
    enabled: false
  })

  function onClose() {
    props.setOpen(false)
    qClient.resetQueries({ queryKey: ["manualCheckIn"] })
    setStudentId("")
  }

  return (
    <>
      <Modal opened={props.open} onClose={onClose}>
        {
          checkinQ.data && !shouldReset
            ? (
              <Stack align="center" justify="center" gap={20}>
                <IconCheck color="green" size={100} style={indicatorStyle} />
                <Title ta="center">{checkinQ.data} just signed in.</Title>
                <Button 
                  onClick={onClose}
                  w="100%"
                  radius={12}
                >Ok</Button>
              </Stack>
            )
            : (
              <>
                <Title mb={20}>Sign in manually</Title>
                <form onSubmit={() => checkinQ.refetch()}>
                  <TextInput
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="Enter your student ID"
                    size="lg"
                    radius={12}
                    mb={20}
                  />
                  <ModeSelectComponent
                    value={mode}
                    onChange={(newMode) => newMode && setMode(newMode as ModeOption)}
                    mb={20}
                    labelProps={{ size: "sm" }}
                  />
                  <SignInButton submitting={checkinQ.isFetching} />
                </form>
              </>
            )
        }
      </Modal>
    </>
  )
}

const indicatorStyle = {
  marginTop: 20,
  zIndex: 3,
  transition: "transform 0.2s",
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  background: "white",
  borderRadius: "50%",
  padding: 12,
};