import { MTable } from "@/components/model/table";
import { useParams } from "@/lib/router";

export default () => {
  const params = useParams();
  return <><MTable modelName={params.name as any} /></>
}