import { Routes } from '@angular/router';
import { DashboardComponent } from './views/dashboard/dashboard.component';
import { CampaignsComponent } from './views/campaigns/campaigns.component';
import { CampaignNewComponent } from './views/campaign-new/campaign-new.component';
import { AudiencesComponent } from './views/audiences/audiences.component';
import { TemplatesComponent } from './views/templates/templates.component';
import { JourneysComponent } from './views/journeys/journeys.component';
import { InboxComponent } from './views/inbox/inbox.component';
import { AgentComponent } from './views/agent/agent.component';
import { GovernanceComponent } from './views/governance/governance.component';
import { ReportsComponent } from './views/reports/reports.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'campanas/nueva', component: CampaignNewComponent },
  { path: 'campanas', component: CampaignsComponent },
  { path: 'audiencias', component: AudiencesComponent },
  { path: 'plantillas', component: TemplatesComponent },
  { path: 'journeys', component: JourneysComponent },
  { path: 'conversaciones', component: InboxComponent },
  { path: 'agente', component: AgentComponent },
  { path: 'gobernanza', component: GovernanceComponent },
  { path: 'reportes', component: ReportsComponent },
  { path: '**', redirectTo: 'dashboard' }
];
