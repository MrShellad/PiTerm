import { useSearchParams } from 'react-router-dom';
import { FileEditor } from '@/features/fs/editor/FileEditor';
import { FileEntry } from '@/features/fs/types';

export const FileEditorPage = () => {
    const [searchParams] = useSearchParams();
    
    // 从 URL 获取参数
    const sessionId = searchParams.get('sessionId');
    const path = searchParams.get('path');
    const name = searchParams.get('name');

    if (!sessionId || !path || !name) {
        return <div className="p-10 text-red-500">Invalid Editor Parameters</div>;
    }

    // 构造临时的 FileEntry 对象 (编辑器只需要这几个字段)
    const mockFile: FileEntry = {
        name,
        path,
        isDir: false,
        size: 0, // 不重要
        lastModified: 0,
        permissions: '',
        owner: '',
        group: '',
        extension: name.split('.').pop() || ''
    };

    return (
        <FileEditor
            sessionId={sessionId}
            file={mockFile}
            isStandalone={true}
        />
    );
};
