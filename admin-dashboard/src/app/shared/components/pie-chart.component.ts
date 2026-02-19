import { Component, ElementRef, ChangeDetectionStrategy, effect, input, viewChild, OnInit } from '@angular/core';
import { Chart, PieController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, ChartConfiguration, ChartData } from 'chart.js';

// Register Chart.js components
Chart.register(PieController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface PieChartData {
    labels: string[];
    datasets: {
        label?: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
    }[];
}

@Component({
    selector: 'app-pie-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="relative w-full h-full flex justify-center items-center" [style.height]="height()">
      <canvas #chartCanvas></canvas>
    </div>
  `
})
export class PieChartComponent implements OnInit {
    data = input.required<PieChartData>();
    height = input<string>('300px');

    private chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
    private chart?: Chart<'pie', number[], string>;

    constructor() {
        // React to data changes using effect
        effect(() => {
            const chartData = this.data();
            if (this.chart && chartData) {
                this.updateChart(chartData);
            }
        });
    }

    ngOnInit(): void {
        this.initChart();
    }

    private initChart(): void {
        const canvas = this.chartCanvas().nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const config: ChartConfiguration<'pie', number[], string> = {
            type: 'pie',
            data: this.data() as ChartData<'pie', number[], string>,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right', // Legend on the right for pie often looks better
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true
                    }
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart(data: PieChartData): void {
        if (!this.chart) return;
        this.chart.data = data as ChartData<'pie', number[], string>;
        this.chart.update();
    }
}
