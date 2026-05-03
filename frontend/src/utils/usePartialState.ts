import { useState, type Dispatch } from "react";

export function usePartialState<T extends Object>(value: T): [T, Dispatch<Partial<T>>] {
  const [val, setVal] = useState(value)

  function updateVal(newData: Partial<T>) {
    setVal(prevValue => ({...prevValue, ...newData}))
  }
  
  return [val, updateVal]
}