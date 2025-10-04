import { Affix, Button, Center, Modal, TextInput, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchBackend } from '../api/fetchBackend'
import type { AdminPerms } from '../api/perms'
import { SignInButton } from './SignInButton'

interface ManualCheckInProps { 
  perms?: AdminPerms
}

export default function ManualCheckInModal(props: ManualCheckInProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [studentId, setStudentId] = useState("")
  const checkinQ = useQuery({
    queryKey: ["manualCheckIn"],
    queryFn: async () => {
      const idAsNum = parseInt(studentId)
      if (Number.isNaN(idAsNum)) {
        window.alert("Invalid student ID")
        return false
      }
      const res = await fetchBackend("/checkin/runManual/", {
        method: "POST",
        credentials: 'include',
        body: JSON.stringify({ student_id: idAsNum })
      })

      switch (res.status) {
        case 400:
          window.alert("Invalid Student ID.")
          return null
        case 401:
          window.alert("Dev error: insufficient perms(bruH)")
          return null
        case 405:
          window.alert("There are no free blocks to sign in to.")
          return null
        case 200:
          return (await res.json())["studentName"]
        default:
          window.alert("LMAO unknown error: " + res.status)
          return null
      }
    },
    enabled: false
  })

  return (
    <>
      <Affix bottom={200} w="100%" display={props.perms?.teacherMonitored ? undefined : "none"}>
        <Center>
          <Button 
            bg="red" 
            size="lg"
            onClick={() => setModalOpen(true)}
          >
            Don't have a phone?
          </Button>
        </Center>
      </Affix>
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)}>
        {
          checkinQ.data 
            ? (
              <>
                <Title mb={30}>Thanks for signing in, {checkinQ.data}!</Title>
                <Button onClick={() => setModalOpen(false)}>Ok</Button>
              </>
            )
            : (
              <>
                <Title mb={30}>Sign in manually</Title>
                <form onSubmit={() => checkinQ.refetch()}>
                  <TextInput
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="Student ID(The numbers on your ID card)"
                    size="lg"
                    radius={12}
                    mb={20}
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