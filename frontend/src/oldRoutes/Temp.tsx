// import { ActionIcon, AppShell, Checkbox, Divider, Group, Loader, Paper, rem, ScrollArea, Select, TextInput, Title, Text, Badge, Tooltip } from '@mantine/core';
// import { useMutation } from '@tanstack/react-query';
// import { createFileRoute } from '@tanstack/react-router';
// import { useEffect, useState } from 'react';
// import { IconReload, IconSettings2 } from '../components/icons.tsx';
// import { fetchBackend } from '../api/fetchBackend.ts';
// import { useAdminLoginRedirect } from '../api/perms.ts';

// export const Route = createFileRoute('/NewAdmin')({
//   component: NewAdmin,
// })

// function NewAdmin() {
//   const [block, setBlock] = useState("A");
//   const [searchQ, setSearchQ] = useState("");
//   const [students, setStudents] = useState([]);
//   const studentsM = useMutation({
//     mutationFn: async () => {
//       const res = await fetchBackend(`/checkin/students/${block}`);
//       const students = await res.json();
//       setStudents(students);
//     }
//   });
//   const loggedIn = useAdminLoginRedirect();

//   const [checkedItems, setCheckedItems] = useState(() => {
//     const txt = window.localStorage.getItem("checkedItems");
//     return (txt == null ? [] : JSON.parse(txt)) as string[];
//   });
//   const checked = (name: string) => checkedItems.includes(name);
//   const setChecked = (checked: boolean, name: string) => setCheckedItems(prevValue => {
//     let newItems = prevValue;
//     if (checked) {
//       if (!newItems.includes(name)) newItems = newItems.concat(name);
//     } else {
//       newItems = newItems.filter(item => item !== name);
//     }
//     window.localStorage.setItem("checkedItems", JSON.stringify(newItems));
//     return newItems;
//   });

//   function isSearched(student: any) {
//     return searchQ === "" ||
//       student.name.toLowerCase().includes(searchQ.toLowerCase()) ||
//       (student.id && student.id.toLowerCase().includes(searchQ.toLowerCase()));
//   }

//   // Fetch students on mount and when block changes
//   useEffect(() => {
//     studentsM.mutate();
//   }, [block]);

//   if (loggedIn.isFetching) {
//     return (
//       <Group justify="center" align="center" style={{ minHeight: "100vh" }}>
//         <Loader size="xl" />
//         <Title order={3} ml="md">Loading admin dashboard...</Title>
//       </Group>
//     );
//   }

//   return (
//     <AppShell
//       padding="md"
//       header={{ height: 60 }}
//       navbar={{ width: 260, breakpoint: 'sm' }}
//       style={{ background: "#f6f8fa" }}
//     >
//       <AppShell.Header p={rem(15)} style={{ background: "#fff", borderBottom: "1px solid #e9ecef" }}>
//         <Group gap={rem(10)}>
//           <img src="icon.svg" width={32} height={32} style={{ borderRadius: 8 }} />
//           <Title order={3} fw={700} c="blue">CA Check-in Admin</Title>
//           <ActionIcon variant="transparent" size="lg" ml="auto">
//             <IconSettings2 size={rem(32)} />
//           </ActionIcon>
//         </Group>
//       </AppShell.Header>

//       <AppShell.Navbar p="md" style={{ background: "#f8fafc", borderRight: "1px solid #e9ecef" }}>
//         <Title order={4} mb={rem(8)} c="gray.7">Options</Title>
//         <Divider mb={rem(12)} />
//         <Select
//           data={["A", "B", "C", "D", "E", "F", "G"]}
//           value={block}
//           onChange={block => {
//             if (block == null) return;
//             setBlock(block);
//             studentsM.mutate();
//           }}
//           size="md"
//           maw={rem(120)}
//           styles={{
//             root: { fontWeight: "bold" }
//           }}
//           label="Free Period"
//         />
//         <TextInput
//           value={searchQ}
//           onChange={e => setSearchQ(e.target.value)}
//           placeholder="Search by name or ID"
//           w={rem(200)}
//           label="Student Search"
//           mt={rem(16)}
//         />
//         <Divider mt={rem(16)} mb={rem(8)} />
//         <Group gap={rem(8)}>
//           <ActionIcon
//             variant="outline"
//             color="blue"
//             radius="lg"
//             onClick={() => studentsM.mutate()}
//             loading={studentsM.isPending}
//           >
//             <IconReload size="20" />
//           </ActionIcon>
//           <Text size="sm" c="gray.6">Reload students</Text>
//         </Group>
//       </AppShell.Navbar>

//       <AppShell.Main maw={rem(700)} style={{ margin: "0 auto" }}>
//         <Group gap={rem(10)} mb={rem(10)} align="center">
//           <Title order={4} c="gray.7">Students for {block} block</Title>
//           <TextInput
//             ml="auto"
//             value={searchQ}
//             onChange={e => setSearchQ(e.target.value)}
//             placeholder="Quick search"
//             w={rem(200)}
//           />
//         </Group>
//         <Divider mb={rem(10)} />
//         <ScrollArea offsetScrollbars="y" h={rem(500)}>
//           {
//             students
//               .filter(isSearched)
//               .map(
//                 (student: any) =>
//                   <StudentListing
//                     name={student.name}
//                     checked={checked(student.name)}
//                     setChecked={c => setChecked(c, student.name)}
//                     checkedIn={student.checked_in}
//                   />
//               )
//           }
//         </ScrollArea>
//       </AppShell.Main>
//     </AppShell>
//   );
// }

// // Helper to get color and label for checked_in status
// function getStatusProps(checked_in: string) {
//   switch (checked_in) {
//     case "yes":
//       return { color: "green", label: "Checked In" };
//     case "tentative":
//       return { color: "yellow", label: "Tentative" };
//     case "no":
//     default:
//       return { color: "red", label: "Absent" };
//   }
// }

// function StudentListing(args: {
//   name: string,
//   id?: string,
//   checked: boolean,
//   setChecked: (checked: boolean) => void,
//   checkedIn: string
// }) {
//   const status = getStatusProps(args.checkedIn);
//   return (
//     <Paper
//       shadow="xs"
//       radius={rem(10)}
//       p={rem(14)}
//       mb={rem(10)}
//       style={{
//         background: status.color === "green"
//           ? "linear-gradient(90deg,#e6fcf5 0%,#d3f9d8 100%)"
//           : status.color === "yellow"
//             ? "linear-gradient(90deg,#fff9db 0%,#fff3bf 100%)"
//             : "linear-gradient(90deg,#fff0f0 0%,#ffe3e3 100%)",
//         border: `2px solid ${status.color === "green"
//           ? "#38d9a9"
//           : status.color === "yellow"
//             ? "#ffd43b"
//             : "#fa5252"}`
//       }}
//       onClick={() => args.setChecked(!args.checked)}
//     >
//       <Group justify="space-between" align="center">
//         <Group gap={rem(8)}>
//           <Title order={5} fw={600}>{args.name}</Title>
//           {args.id && <Text size="xs" c="gray.6">ID: {args.id}</Text>}
//           <Badge color={status.color} variant="filled" size="sm">{status.label}</Badge>
//         </Group>
//         <Tooltip label="Mark for review" position="left">
//           <Checkbox
//             bg="#fafbfe"
//             checked={args.checked}
//             onChange={e => args.setChecked(e.currentTarget.checked)}
//             color="blue"
//             size="lg"
//             radius="md"
//           />
//         </Tooltip>
//       </Group>
//     </Paper>
//   );
// }