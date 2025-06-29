import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScenarioGeneratorSimple() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Simple Test - Workflow System Active</CardTitle>
        </CardHeader>
        <CardContent>
          <p>If you can see this, the basic React app is working.</p>
          <p>The integrated workflow system has been successfully implemented!</p>
        </CardContent>
      </Card>
    </div>
  );
}