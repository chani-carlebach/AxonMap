import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appPulse]',
  standalone: false
})
export class PulseDirective implements OnInit {
  @Input() appPulse: string = '';  // מקבל את רמת העדיפות

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    if (this.appPulse === 'CRITICAL') {
      this.el.nativeElement.style.boxShadow = '0 0 0 2px #ef4444';
    }
  }

  @HostListener('mouseenter')
  onEnter(): void {
    if (this.appPulse === 'CRITICAL') {
      this.el.nativeElement.style.transform = 'scale(1.02)';
      this.el.nativeElement.style.transition = 'transform 0.15s ease';
      this.el.nativeElement.style.boxShadow = '0 0 0 3px #ef4444, 0 4px 12px rgba(239,68,68,0.3)';
    }
  }

  @HostListener('mouseleave')
  onLeave(): void {
    if (this.appPulse === 'CRITICAL') {
      this.el.nativeElement.style.transform = 'scale(1)';
      this.el.nativeElement.style.boxShadow = '0 0 0 2px #ef4444';
    }
  }
}
