import { Component, ElementRef, ChangeDetectionStrategy, effect, input, viewChild, OnInit } from '@angular/core';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartConfiguration, ChartData } from 'chart.js';

// Register Chart.js components
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface BarChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
    }[];
}

@Component({
    selector: 'app-bar-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="relative" [style.height]="height()">
      <canvas #chartCanvas></canvas>
    </div>
  `
})
export class BarChartComponent implements OnInit {
    data = input.required<BarChartData>();
    height = input<string>('300px');

    private chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
    private chart?: Chart<'bar', number[], string>;

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
        const ctx = this.chartCanvas().nativeElement.getContext('2d');
        if (!ctx) return;

        const config: ChartConfiguration<'bar', number[], string> = {
            type: 'bar',
            data: this.data() as ChartData<'bar', number[], string>,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart(data: BarChartData): void {
        if (!this.chart) return;
        this.chart.data = data as ChartData<'bar', number[], string>;
        this.chart.update();
    }
}
