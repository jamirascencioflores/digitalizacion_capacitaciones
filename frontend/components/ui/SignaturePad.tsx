// frontend/components/ui/SignaturePad.tsx
'use client';

import React, { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onChange?: (isEmpty: boolean) => void;
}

// Usamos forwardRef para poder limpiar el canvas desde el padre
const SignaturePad = React.forwardRef<SignatureCanvas, SignaturePadProps>(({ onChange }, ref) => {
    const [isEmpty, setIsEmpty] = useState(true);
    // Casteamos el ref para que TypeScript sepa que es un SignatureCanvas
    const canvasRef = ref as React.MutableRefObject<SignatureCanvas | null>;

    const handleClear = () => {
        canvasRef.current?.clear();
        setIsEmpty(true);
        onChange?.(true);
    };

    const handleEnd = () => {
        const empty = canvasRef.current?.isEmpty() ?? true;
        setIsEmpty(empty);
        onChange?.(empty);
    };

    return (
        <div className="border-2 border-gray-300 border-dashed rounded-xl relative bg-gray-50 overflow-hidden group hover:border-blue-400 transition">
            <SignatureCanvas
                ref={canvasRef}
                penColor="black"
                canvasProps={{ className: 'w-full h-40 cursor-crosshair', style: { touchAction: 'none' } }}
                onEnd={handleEnd}
            />
            {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm font-medium">
                    Firme aquí
                </div>
            )}
            {!isEmpty && (
                <button type="button" onClick={handleClear} className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm text-gray-600 rounded-full hover:bg-red-100 hover:text-red-600 shadow-sm transition">
                    <Eraser size={18} />
                </button>
            )}
        </div>
    );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;