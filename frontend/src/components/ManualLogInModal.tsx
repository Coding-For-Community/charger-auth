import { Affix, Button, Center, Modal, TextInput, Title } from '@mantine/core'
import { useState } from 'react'
import { SignInButton } from './SignInButton'
import type { AdminPerms } from '../utils/adminPerms'
import { useQuery } from '@tanstack/react-query'
import { fetchBackend } from '../utils/fetchBackend'

export function ManualLoginModal({ perms }: { perms?: AdminPerms }) {
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
          return false
        case 401:
          window.alert("Dev error: insufficient perms(bruH)")
          return false
        case 405:
          window.alert("There are no free blocks to sign in to.")
          return false
        case 200:
          setModalOpen(false)
          return true
        default:
          window.alert("LMAO unknown error: " + res.status)
          return false
      }
    },
    enabled: false
  })

  return (
    <>
    <Affix bottom={100} w="100%" display={perms?.manualCheckIn ? undefined : "none"}>
      <Center>
        <Button bg="red" onClick={() => setModalOpen(true)}>Don't have a phone with you?</Button>
      </Center>
    </Affix>

    <Modal opened={modalOpen} onClose={() => setModalOpen(false)}>
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
    </Modal>
    </>
  )
}