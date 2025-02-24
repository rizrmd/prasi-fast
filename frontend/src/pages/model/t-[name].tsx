import { useParams } from "@/lib/router"

export default () => {
  const params = useParams();
  return <>Mantap jiwa {JSON.stringify(params)}</>
}