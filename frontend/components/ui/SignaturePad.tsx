// frontend/components/ui/SignaturePad.tsx
'use client';

import React, { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onChange?: (isEmpty: boolean) => void;
}

const SignaturePad = React.forwardRef<SignatureCanvas, SignaturePadProps>(({ onChange }, ref) => {
    const [isEmpty, setIsEmpty] = useState(true);

    // 🟢 No creamos canvasRef interno. Usamos el 'ref' que viene por parámetro directamente.

    const handleClear = () => {
        // Para limpiar, verificamos si el ref es una función o un objeto (estándar de React)
        if (ref && 'current' in ref && ref.current) {
            ref.current.clear();
            setIsEmpty(true);
            onChange?.(true);
        }
    };

    const handleEnd = () => {
        if (ref && 'current' in ref && ref.current) {
            const empty = ref.current.isEmpty();
            setIsEmpty(empty);
            onChange?.(empty);
        }
    };

    return (
        <div className="border-2 border-gray-300 border-dashed rounded-xl relative bg-gray-50 overflow-hidden group hover:border-blue-400 transition">
            <SignatureCanvas
                ref={ref} // 🟢 Pasamos el ref del padre directamente aquí
                penColor="black"
                canvasProps={{
                    className: 'w-full h-40 cursor-crosshair',
                    style: { touchAction: 'none' }
                }}
                onEnd={handleEnd}
            />
            {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm font-medium">
                    Firme aquí
                </div>
            )}
            {!isEmpty && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm text-gray-600 rounded-full hover:bg-red-100 hover:text-red-600 shadow-sm transition"
                >
                    <Eraser size={18} />
                </button>
            )}
        </div>
    );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;