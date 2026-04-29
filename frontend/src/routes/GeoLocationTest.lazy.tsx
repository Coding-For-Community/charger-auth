import { Button, Text, Title } from "@mantine/core";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const TOWN_HALL_LATITUDE_RANGE = [35.8201, 35.8205]
const TOWN_HALL_LONGITUDE_RANGE = [-78.76947, -78.7689]

export const Route = createLazyFileRoute("/GeoLocationTest")({
  component: GeoLocationTest,
});

function GeoLocationTest() {
  const [msg, setMsg] = useState("") 

  return (
    <>
      <Title order={3} ta="center" mb="xs">
        Town Hall Check-In
      </Title>
      <Text>
        Automatic town hall check-ins require your current location (to ensure that you aren't off and away).
        If you don't like this, it's totally fine - just check-in manually with your advisor. 
      </Text>

      <Button onClick={() => {
        navigator.geolocation.getCurrentPosition(position => {
          const latitude = position.coords.latitude
          const longitude = position.coords.longitude
          const latInRange = latitude > TOWN_HALL_LATITUDE_RANGE[0] && latitude < TOWN_HALL_LATITUDE_RANGE[1]
          const longInRange = longitude > TOWN_HALL_LONGITUDE_RANGE[0] && longitude < TOWN_HALL_LONGITUDE_RANGE[1]
          setMsg(
            `
            Latitude: ${latitude}, Longitude: ${longitude}, \n 
            Latitude in Range: ${latInRange}, Longitude in Range: ${longInRange}
            `
          )
        })
      }}>
        Approve check-in
      </Button>

      <Text>{msg}</Text>
    </>
  )
}