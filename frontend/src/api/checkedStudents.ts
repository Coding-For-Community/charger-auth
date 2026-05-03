import { useState } from "react";


export function useCheckedStudents() {
  const [students, setStudents] = useState(() => {
    try {
      const txt = window.localStorage.getItem("checkedItems");
      return (txt == null ? [] : JSON.parse(txt)) as string[];
    } catch (e) {
      console.error(e)
      return []
    }
  });

  function setChecked(checked: boolean, name: string) {
    setStudents((prevValue) => {
      let newItems = prevValue;
      if (checked) {
        if (!newItems.includes(name)) newItems = newItems.concat(name);
      } else {
        newItems = newItems.filter((item) => item !== name);
      }
      window.localStorage.setItem("checkedItems", JSON.stringify(newItems));
      return newItems;
    });
  }

  return {
    isChecked: (name: string) => students.includes(name),
    setChecked,
    clearChecked: () => setStudents([]),
  }
}