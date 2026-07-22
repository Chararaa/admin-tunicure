import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Doctor } from '../services/doctor.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-doctor-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class DoctorStatisticsComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('overallChart') overallChartRef!: ElementRef;
  @ViewChild('successRateChart') successRateChartRef!: ElementRef;
  @ViewChild('monthlyTrendChart') monthlyTrendChartRef!: ElementRef;
  @ViewChild('doctorDetailChart') doctorDetailChartRef!: ElementRef;

  @Input() doctors: Doctor[] = [];
  @Input() selectedDoctor: Doctor | null = null;

  private overallChart: Chart | null = null;
  private successRateChart: Chart | null = null;
  private monthlyTrendChart: Chart | null = null;
  private doctorDetailChart: Chart | null = null;

  private chartsInitialized = false;

  ngOnInit() {
    console.log('Statistics Component - Doctors data:', this.doctors);
  }

  ngAfterViewInit() {
    // Attendre un peu pour s'assurer que les éléments du DOM sont prêts
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('Statistics Component - Changes detected:', changes);
    
    if (changes['doctors'] && this.chartsInitialized) {
      console.log('Updating charts with new doctors data');
      this.updateCharts();
    }
    
    if (changes['selectedDoctor'] && this.selectedDoctor && this.chartsInitialized) {
      console.log('Updating doctor detail chart');
      this.updateDoctorDetailChart();
    }
  }

  private initializeCharts() {
    if (this.doctors.length === 0) {
      console.log('No doctors data available for charts');
      return;
    }

    console.log('Initializing charts with', this.doctors.length, 'doctors');
    
    this.createOverallChart();
    this.createSuccessRateChart();
    this.createMonthlyTrendChart();
    
    if (this.selectedDoctor) {
      this.createDoctorDetailChart();
    }
    
    this.chartsInitialized = true;
  }

  private createOverallChart() {
    if (!this.overallChartRef?.nativeElement) {
      console.error('Overall chart element not found');
      return;
    }

    // Détruire le graphique existant
    if (this.overallChart) {
      this.overallChart.destroy();
    }

    const ctx = this.overallChartRef.nativeElement.getContext('2d');
    const labels = this.doctors.map(d => 
      d.personalInfo.name.split(' ').slice(0, 2).map(n => n[0]).join('.') + '.'
    );

    console.log('Overall Chart Labels:', labels);
    console.log('Overall Chart Data - Total:', this.doctors.map(d => d.statistics.totalOperations));
    console.log('Overall Chart Data - Completed:', this.doctors.map(d => d.statistics.completedOperations));
    
    this.overallChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Opérations Total',
            data: this.doctors.map(d => d.statistics.totalOperations),
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            borderRadius: 4,
            barPercentage: 0.6,
          },
          {
            label: 'Opérations Terminées',
            data: this.doctors.map(d => d.statistics.completedOperations),
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            borderRadius: 4,
            barPercentage: 0.6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: 'Statistiques Globales des Docteurs',
            font: {
              size: 16
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Nombre d\'opérations'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Docteurs'
            }
          }
        }
      }
    });
  }

  private createSuccessRateChart() {
    if (!this.successRateChartRef?.nativeElement) {
      console.error('Success rate chart element not found');
      return;
    }

    if (this.successRateChart) {
      this.successRateChart.destroy();
    }

    const ctx = this.successRateChartRef.nativeElement.getContext('2d');
    const labels = this.doctors.map(d => d.personalInfo.name.split(' ')[0]);
    const successRates = this.doctors.map(d => d.statistics.successRate);
    const backgroundColors = successRates.map(rate => this.getSuccessRateColor(rate, true));
    const borderColors = successRates.map(rate => this.getSuccessRateColor(rate, false));

    console.log('Success Rate Chart Labels:', labels);
    console.log('Success Rate Chart Data:', successRates);
    
    this.successRateChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Taux de Succès (%)',
            data: successRates,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 4,
            barPercentage: 0.7,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: 'Taux de Succès par Docteur',
            font: {
              size: 16
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `Taux de succès: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Taux de Succès (%)'
            },
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  private createMonthlyTrendChart() {
    if (!this.monthlyTrendChartRef?.nativeElement) {
      console.error('Monthly trend chart element not found');
      return;
    }

    if (this.monthlyTrendChart) {
      this.monthlyTrendChart.destroy();
    }

    const ctx = this.monthlyTrendChartRef.nativeElement.getContext('2d');
    
    // Données simulées pour la démonstration
    const plannedOperations = Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 20);
    const completedOperations = plannedOperations.map(value => Math.floor(value * (0.7 + Math.random() * 0.3)));

    console.log('Monthly Trend Data - Planned:', plannedOperations);
    console.log('Monthly Trend Data - Completed:', completedOperations);
    
    this.monthlyTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
        datasets: [
          {
            label: 'Opérations Planifiées',
            data: plannedOperations,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true
          },
          {
            label: 'Opérations Réalisées',
            data: completedOperations,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
          },
          title: {
            display: true,
            text: 'Évolution Mensuelle des Opérations',
            font: {
              size: 16
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Nombre d\'opérations'
            }
          }
        }
      }
    });
  }

  private createDoctorDetailChart() {
    if (!this.selectedDoctor || !this.doctorDetailChartRef?.nativeElement) {
      return;
    }

    if (this.doctorDetailChart) {
      this.doctorDetailChart.destroy();
    }

    const ctx = this.doctorDetailChartRef.nativeElement.getContext('2d');
    
    console.log('Doctor Detail Chart - Data for:', this.selectedDoctor.personalInfo.name, {
      total: this.selectedDoctor.statistics.totalOperations,
      completed: this.selectedDoctor.statistics.completedOperations,
      successRate: this.selectedDoctor.statistics.successRate
    });
    
    this.doctorDetailChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Opérations Total', 'Opérations Terminées', 'Taux de Succès'],
        datasets: [
          {
            label: `Dr. ${this.selectedDoctor.personalInfo.name}`,
            data: [
              this.selectedDoctor.statistics.totalOperations,
              this.selectedDoctor.statistics.completedOperations,
              this.selectedDoctor.statistics.successRate
            ],
            backgroundColor: [
              'rgba(54, 162, 235, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(255, 99, 132, 0.7)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 2,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
          },
          title: {
            display: true,
            text: 'Statistiques Détaillées',
            font: {
              size: 14
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  private updateCharts() {
    console.log('Updating all charts');
    this.createOverallChart();
    this.createSuccessRateChart();
    this.createMonthlyTrendChart();
    
    if (this.selectedDoctor) {
      this.createDoctorDetailChart();
    }
  }

  private updateDoctorDetailChart() {
    if (this.selectedDoctor) {
      this.createDoctorDetailChart();
    }
  }

  private getSuccessRateColor(rate: number, asRgba: boolean = false): string {
    if (asRgba) {
      if (rate >= 90) return 'rgba(40, 167, 69, 0.7)';
      if (rate >= 70) return 'rgba(255, 193, 7, 0.7)';
      return 'rgba(220, 53, 69, 0.7)';
    } else {
      if (rate >= 90) return 'rgba(40, 167, 69, 1)';
      if (rate >= 70) return 'rgba(255, 193, 7, 1)';
      return 'rgba(220, 53, 69, 1)';
    }
  }

  // Helper methods
  getTotalOperations(): number {
    return this.doctors.reduce((total, doctor) => total + doctor.statistics.totalOperations, 0);
  }

  getCompletedOperations(): number {
    return this.doctors.reduce((total, doctor) => total + doctor.statistics.completedOperations, 0);
  }

  getAverageSuccessRate(): number {
    if (this.doctors.length === 0) return 0;
    const total = this.doctors.reduce((sum, doctor) => sum + doctor.statistics.successRate, 0);
    return total / this.doctors.length;
  }

  exportData() {
    const csvContent = this.convertToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'statistiques-docteurs.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(): string {
    const headers = ['Docteur', 'Spécialité', 'Opérations Total', 'Opérations Terminées', 'Taux de Succès (%)'];
    const rows = this.doctors.map(doctor => [
      doctor.personalInfo.name,
      doctor.personalInfo.specialties,
      doctor.statistics.totalOperations.toString(),
      doctor.statistics.completedOperations.toString(),
      doctor.statistics.successRate.toString()
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  // Nettoyer les graphiques
  ngOnDestroy() {
    if (this.overallChart) this.overallChart.destroy();
    if (this.successRateChart) this.successRateChart.destroy();
    if (this.monthlyTrendChart) this.monthlyTrendChart.destroy();
    if (this.doctorDetailChart) this.doctorDetailChart.destroy();
  }
}